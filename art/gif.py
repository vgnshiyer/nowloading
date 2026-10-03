# Turns the frames art/gifs.mjs recorded into one looping GIF per theme in docs/.
import glob, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', '.gifs')
OUT = os.path.join(ROOT, 'docs')

os.makedirs(OUT, exist_ok=True)
for name in sorted(os.listdir(SRC)):
    frames = [Image.open(p).convert('RGB') for p in sorted(glob.glob(os.path.join(SRC, name, '*.png')))]
    # One palette for the whole clip, so colors don't shimmer between frames
    strip = Image.new('RGB', (frames[0].width, frames[0].height * len(frames[::8])))
    for i, f in enumerate(frames[::8]):
        strip.paste(f, (0, i * f.height))
    palette = strip.quantize(colors=64, method=Image.Quantize.MEDIANCUT)
    gif = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
    path = os.path.join(OUT, f'{name}.gif')
    gif[0].save(path, save_all=True, append_images=gif[1:], duration=100, loop=0, optimize=True, disposal=1)
    print(f'{name}: {len(frames)} frames, {os.path.getsize(path) // 1024} KB')
