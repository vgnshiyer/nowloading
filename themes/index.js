// Every theme, by name. A family is a set of looks that share a source; each look is its own theme.
// Adding a theme: write themes/<family>.js (see vhs.js), then add one import and one entry below.
import vhs from './vhs.js'
import splitflap from './splitflap.js'
import sandglass from './sandglass.js'
import floppy from './floppy.js'
import dotmatrix from './dotmatrix.js'
import pong from './pong.js'
import filmstrip from './filmstrip.js'

export const FAMILIES = [vhs, splitflap, sandglass, floppy, dotmatrix, pong, filmstrip]
export const THEMES = Object.fromEntries(FAMILIES.flatMap(family => family.looks.map(look => [look.name, look])))
export const NAMES = Object.keys(THEMES)
