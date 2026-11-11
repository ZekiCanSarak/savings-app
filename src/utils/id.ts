/**
 * Creates a unique-enough id for items stored on this one device,
 * e.g. 'mhv3k2x1-8f3a9c'. Not suitable for anything security-related.
 */
export function createId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${time}-${random}`;
}
