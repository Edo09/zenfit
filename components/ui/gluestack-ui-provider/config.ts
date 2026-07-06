import { vars } from 'nativewind';

// Hokage palette bridged to gluestack semantic tokens (RGB triplets).
// NATIVE: these vars() maps are NOT the switching mechanism — the dark
// scheme lives in src/global.css (@media prefers-color-scheme, driven by
// RN Appearance). These maps matter on WEB, where index.web.tsx emits them
// as :root{}/.dark{} blocks for the class-based toggle.
// Keep in sync with src/global.css.
const hokageLight = {
  '--primary': '220 38 38', // brand-primary #dc2626
  '--primary-foreground': '255 255 255',
  '--card': '255 255 255', // surface #ffffff
  '--secondary': '37 99 235', // brand-secondary #2563eb
  '--secondary-foreground': '255 255 255',
  '--background': '248 250 252', // canvas #f8fafc
  '--popover': '255 255 255',
  '--popover-foreground': '15 23 42',
  '--muted': '241 245 249',
  '--muted-foreground': '100 116 139', // content-tertiary #64748b
  '--destructive': '220 38 38', // error #dc2626
  '--foreground': '15 23 42',
  '--border': '226 232 240', // border #e2e8f0
  '--input': '241 245 249',
  '--ring': '203 213 225', // border-strong #cbd5e1
  '--accent': '241 245 249',
  '--accent-foreground': '15 23 42',
};

const hokageDark = {
  '--primary': '239 68 68', // brand-primary #ef4444
  '--primary-foreground': '255 255 255',
  '--card': '30 41 59', // surface #1e293b
  '--secondary': '59 130 246', // brand-secondary #3b82f6
  '--secondary-foreground': '248 250 252',
  '--background': '15 23 42', // canvas #0f172a
  '--popover': '30 41 59',
  '--popover-foreground': '248 250 252',
  '--muted': '51 65 85',
  '--muted-foreground': '148 163 184', // content-tertiary #94a3b8
  '--destructive': '239 68 68', // error #ef4444
  '--foreground': '248 250 252',
  '--border': '51 65 85', // border #334155
  '--input': '51 65 85',
  '--ring': '71 85 105', // border-strong #475569
  '--accent': '51 65 85',
  '--accent-foreground': '248 250 252',
};

export const colors = {
  light: hokageLight,
  dark: hokageDark,
};

// Config for nativewind vars() - used by provider
export const config = {
  light: vars(colors.light),
  dark: vars(colors.dark),
};
