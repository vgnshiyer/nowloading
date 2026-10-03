// Every theme, by name. A family is a set of looks that share a source; each look is its own theme.
// Adding a theme: write themes/<family>.js (see vhs.js), then add one import and one entry below.
import vhs from './vhs.js'
import splitflap from './splitflap.js'
import sandglass from './sandglass.js'

export const FAMILIES = [vhs, splitflap, sandglass]
export const THEMES = Object.fromEntries(FAMILIES.flatMap(family => family.looks.map(look => [look.name, look])))
export const NAMES = Object.keys(THEMES)
