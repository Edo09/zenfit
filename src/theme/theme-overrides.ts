// Native no-op. On web, Metro resolves theme-overrides.web.ts instead, which
// loads the :root.light/.dark CSS override blocks for the explicit theme
// toggle. Native needs nothing here — RN Appearance drives the media block
// in global.css directly.
export {};
