/** Length of a run in seconds, from the first tap to the whiteout. */
export const GAME_LENGTH = 20;

/** Photos on the roll. */
export const SHOTS = 5;

/** Seconds the shutter is locked after each photo while the film advances. */
export const FILM_ADVANCE = 0.4;

/** When the screen starts fading to white. */
export const WHITEOUT_START = 18.6;

/**
 * The stage area the camera always keeps in view (world units, at z = 0).
 * Everything that matters for a photo sits inside this box.
 */
export const VIEW_BOX = { left: -12.4, right: 12.4, bottom: -1.5, top: 10.6 };

/** Viewfinder size limits, as a fraction of the canvas height. */
export const VIEWFINDER = { min: 0.14, max: 0.62, start: 0.3 };

/** Window during which everyone on the street turns and waves at the sun. */
export const GROUP_WAVE = { start: 15.2, end: 17.8 };
