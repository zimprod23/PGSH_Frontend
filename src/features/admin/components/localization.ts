/** The three coordinate columns every localisable entity owns (`X`, `Y`, `Z` in the schema). */
export type Coordinates = { localizationX: string; localizationY: string; localizationZ: string };

export const EMPTY_COORDINATES: Coordinates = { localizationX: '', localizationY: '', localizationZ: '' };

/**
 * Coordinates are optional and stored as free text, so they are sent only when filled — an empty
 * string would otherwise overwrite a recorded position with a blank one.
 */
export function coordinatePayload(c: Coordinates) {
  return {
    localizationX: c.localizationX.trim() || undefined,
    localizationY: c.localizationY.trim() || undefined,
    localizationZ: c.localizationZ.trim() || undefined,
  };
}
