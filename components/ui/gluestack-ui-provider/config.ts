import { vars } from 'nativewind';

// Habbito palette bridged to gluestack semantic tokens (RGB triplets).
// App is dark-only: "light" mirrors the dark palette so no mode ever
// renders the stock white theme. Keep in sync with src/global.css
// and src/theme/colors.ts.
const habbitoDark = {
  '--primary': '13 127 242', // brand-primary #0d7ff2
  '--primary-foreground': '255 255 255',
  '--card': '30 41 59', // surface #1e293b
  '--secondary': '51 65 85', // surface-elevated #334155
  '--secondary-foreground': '248 250 252', // content-primary #f8fafc
  '--background': '15 23 42', // brand-dark #0f172a
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
  light: habbitoDark,
  dark: habbitoDark,
};

// Config for nativewind vars() - used by provider
export const config = {
  light: vars(colors.light),
  dark: vars(colors.dark),
};
