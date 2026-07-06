import { vars } from 'nativewind';

// Hokage palette bridged to gluestack semantic tokens (RGB triplets).
// Red primary / blue secondary rebrand — app is light-only: "dark" mirrors the light
// palette so no mode ever renders the stock dark theme. Keep in sync with
// src/global.css and src/theme/colors.ts.
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

export const colors = {
  light: hokageLight,
  dark: hokageLight,
};

// Config for nativewind vars() - used by provider
export const config = {
  light: vars(colors.light),
  dark: vars(colors.dark),
};
