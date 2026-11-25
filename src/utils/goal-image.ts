/**
 * Goal pictures are stored inside the saved data as small JPEG data URIs
 * (about 20–30 KB each), so they need no files and travel in backups. Browsers
 * allow only ~5 MB for the whole save, hence the small size and the cap.
 */
export const GOAL_IMAGE_PREFIX = 'data:image/jpeg;base64,';
/** Pictures are resized to this many pixels square before saving. */
export const GOAL_IMAGE_SIZE = 320;
/** Anything longer than this isn't one of our resized pictures. */
export const MAX_GOAL_IMAGE_LENGTH = 90_000;

export function isValidGoalImage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(GOAL_IMAGE_PREFIX) &&
    value.length > GOAL_IMAGE_PREFIX.length &&
    value.length <= MAX_GOAL_IMAGE_LENGTH &&
    /^[A-Za-z0-9+/=]+$/.test(value.slice(GOAL_IMAGE_PREFIX.length))
  );
}
