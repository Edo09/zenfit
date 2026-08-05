import { vars } from 'nativewind';

// Habbito palette bridged to gluestack semantic tokens (RGB triplets).
// NATIVE: these vars() maps are NOT the switching mechanism — the dark
// scheme lives in src/global.css (@media prefers-color-scheme, driven by
// RN Appearance). These maps matter on WEB, where index.web.tsx emits them
// as :root{}/.dark{} blocks for the class-based toggle.
// Keep in sync with src/global.css.
// NOTE: --primary is a cyan FILL, so --primary-foreground is ink, not white.
const habbitoLight = {
  '--primary': '34 211 238', // brand-primary (cyan) #22d3ee
  '--primary-foreground': '14 26 28', // ink #0e1a1c — never white on cyan
  '--card': '255 255 255', // surface #ffffff
  '--secondary': '78 107 240', // brand-secondary #4e6bf0
  '--secondary-foreground': '255 255 255',
  '--background': '244 245 247', // canvas #f4f5f7
  '--popover': '255 255 255',
  '--popover-foreground': '18 21 26',
  '--muted': '235 237 241', // surface-elevated #ebedf1
  '--muted-foreground': '107 114 125', // content-tertiary #6b727d
  '--destructive': '225 85 60', // error #e1553c
  '--foreground': '18 21 26',
  '--border': '227 230 234', // border #e3e6ea
  '--input': '235 237 241',
  '--ring': '210 215 222', // border-strong #d2d7de
  '--accent': '235 237 241',
  '--accent-foreground': '18 21 26',
};

const habbitoDark = {
  '--primary': '62 224 240', // brand-primary (cyan) #3ee0f0
  '--primary-foreground': '10 21 23', // ink #0a1517
  '--card': '26 30 36', // surface #1a1e24
  '--secondary': '122 147 255', // brand-secondary #7a93ff
  '--secondary-foreground': '242 244 247',
  '--background': '16 19 23', // canvas #101317
  '--popover': '26 30 36',
  '--popover-foreground': '242 244 247',
  '--muted': '36 42 50', // surface-elevated #242a32
  '--muted-foreground': '139 146 157', // content-tertiary #8b929d
  '--destructive': '242 107 82', // error #f26b52
  '--foreground': '242 244 247',
  '--border': '38 43 51', // border #262b33
  '--input': '36 42 50',
  '--ring': '51 57 68', // border-strong #333944
  '--accent': '36 42 50',
  '--accent-foreground': '242 244 247',
};

export const colors = {
  light: habbitoLight,
  dark: habbitoDark,
};

// Config for nativewind vars() - used by provider
export const config = {
  light: vars(colors.light),
  dark: vars(colors.dark),
};
