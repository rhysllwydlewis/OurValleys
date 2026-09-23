export type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two coordinates in kilometres. Used for
 * locality-centroid distances only, never for precise address routing.
 */
export function haversineDistanceKm(from: Coordinate, to: Coordinate): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const chordSquared =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(chordSquared)));
}
