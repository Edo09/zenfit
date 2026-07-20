/**
 * Web-only layout constants. The app is designed phone-first, so on web the
 * whole tree renders inside a centered column of this width (see
 * app/_layout.tsx). Anything that sizes itself from the window width must
 * clamp to this so it doesn't overflow the column.
 */
export const WEB_MAX_WIDTH = 480;
