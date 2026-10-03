# Renders a contact sheet of one theme family so its art can be judged by eye.
#   python3 art/render.py splitflap /tmp/out      (or a path like themes/splitflap.js)  -> /tmp/out-a.png, /tmp/out-b.png
# Each look is drawn in every state of the scripted turn, in light and dark, at 3x and at real size,
# inside a mock of the Code tab's turn line. The two PNGs are taken 0.6s apart, so motion shows as a difference.
import functools, http.server, os, shutil, signal, subprocess, sys, tempfile, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

def serve():
    # The theme modules are ES modules, so the sheet is served over http from the repo root
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server.server_address[1]

def crop(path):
    # Trim the empty page below the sheet
    from PIL import Image, ImageChops
    im = Image.open(path).convert('RGB')
    box = ImageChops.difference(im, Image.new('RGB', im.size, (255, 255, 255))).getbbox()
    if box:
        im.crop((0, 0, im.width, min(im.height, box[3] + 16))).save(path)

def main():
    family = os.path.splitext(os.path.basename(sys.argv[1]))[0]
    out = os.path.abspath(sys.argv[2])
    url = f'http://127.0.0.1:{serve()}/art/sheet.html?family={family}'
    # Both moments render at once, each in its own Chrome profile, so parallel runs never collide.
    # Chrome writes the shot and then sometimes hangs in teardown: wait for the file, then end Chrome ourselves.
    jobs = []
    for tag, ms in (('a', 1200), ('b', 1800)):
        shot = f'{out}-{tag}.png'
        if os.path.exists(shot):
            os.unlink(shot)
        profile = tempfile.mkdtemp(prefix='nl-chrome-')
        proc = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
                                 '--no-default-browser-check', '--disable-extensions', '--disable-sync',
                                 '--disable-component-update', '--disable-background-networking',
                                 f'--user-data-dir={profile}', '--window-size=1830,3600',
                                 f'--virtual-time-budget={ms}', f'--screenshot={shot}', url],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        jobs.append((shot, proc, profile))
    deadline = time.time() + 120
    for shot, proc, profile in jobs:
        last = -1
        while time.time() < deadline:
            time.sleep(0.5)
            size = os.path.getsize(shot) if os.path.exists(shot) else -1
            if size > 0 and (size == last or proc.poll() is not None):
                break
            last = size
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        proc.wait()
        shutil.rmtree(profile, ignore_errors=True)
        if not os.path.exists(shot):
            sys.exit(f'render failed: no {shot}')
        crop(shot)
        print(shot)

if __name__ == '__main__':
    main()
