import type { Coordinate } from "@/lib/geo";

/**
 * WGS84 latitude and longitude to British National Grid eastings and
 * northings (EPSG:27700). The valleys map is drawn on the National Grid,
 * because that is the grid its open geography (Ordnance Survey) is published
 * in. This is the standard Helmert datum shift followed by the Ordnance
 * Survey Transverse Mercator formulae; it is accurate to about five metres,
 * far finer than the locality centroids it is used for.
 */

export type GridReference = { easting: number; northing: number };

const WGS84 = { a: 6378137, b: 6356752.314245 };
const AIRY_1830 = { a: 6377563.396, b: 6356256.909 };

// WGS84 to OSGB36: translations in metres, rotations in arc-seconds, scale in ppm.
const SHIFT = {
  tx: -446.448,
  ty: 125.157,
  tz: -542.06,
  rx: -0.1502,
  ry: -0.247,
  rz: -0.8421,
  s: 20.4894,
};

const SCALE_ON_CENTRAL_MERIDIAN = 0.9996012717;
const ORIGIN_LATITUDE = (49 * Math.PI) / 180;
const ORIGIN_LONGITUDE = (-2 * Math.PI) / 180;
const FALSE_EASTING = 400_000;
const FALSE_NORTHING = -100_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Latitude and longitude on the Airy 1830 ellipsoid (OSGB36), in radians. */
function toOsgb36(coordinate: Coordinate): { lat: number; lng: number } {
  const lat = toRadians(coordinate.latitude);
  const lng = toRadians(coordinate.longitude);

  // To cartesian on WGS84 (height taken as zero).
  const e2 = 1 - (WGS84.b * WGS84.b) / (WGS84.a * WGS84.a);
  const nu = WGS84.a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
  const x1 = nu * Math.cos(lat) * Math.cos(lng);
  const y1 = nu * Math.cos(lat) * Math.sin(lng);
  const z1 = nu * (1 - e2) * Math.sin(lat);

  // Helmert transformation.
  const rx = toRadians(SHIFT.rx / 3600);
  const ry = toRadians(SHIFT.ry / 3600);
  const rz = toRadians(SHIFT.rz / 3600);
  const scale = 1 + SHIFT.s / 1e6;
  const x2 = SHIFT.tx + x1 * scale - y1 * rz + z1 * ry;
  const y2 = SHIFT.ty + x1 * rz + y1 * scale - z1 * rx;
  const z2 = SHIFT.tz - x1 * ry + y1 * rx + z1 * scale;

  // Back to latitude and longitude on Airy 1830.
  const airyE2 = 1 - (AIRY_1830.b * AIRY_1830.b) / (AIRY_1830.a * AIRY_1830.a);
  const p = Math.hypot(x2, y2);
  let latitude = Math.atan2(z2, p * (1 - airyE2));
  for (let step = 0; step < 8; step += 1) {
    const airyNu =
      AIRY_1830.a / Math.sqrt(1 - airyE2 * Math.sin(latitude) ** 2);
    latitude = Math.atan2(z2 + airyE2 * airyNu * Math.sin(latitude), p);
  }
  return { lat: latitude, lng: Math.atan2(y2, x2) };
}

/** Transverse Mercator projection of an OSGB36 position (radians). */
export function projectOsgb36(lat: number, lng: number): GridReference {
  const { a, b } = AIRY_1830;
  const f0 = SCALE_ON_CENTRAL_MERIDIAN;
  const e2 = 1 - (b * b) / (a * a);
  const n = (a - b) / (a + b);
  const n2 = n * n;
  const n3 = n2 * n;

  const sin = Math.sin(lat);
  const cos = Math.cos(lat);
  const tan2 = Math.tan(lat) ** 2;
  const nu = (a * f0) / Math.sqrt(1 - e2 * sin * sin);
  const rho = (a * f0 * (1 - e2)) / (1 - e2 * sin * sin) ** 1.5;
  const eta2 = nu / rho - 1;

  const dLat = lat - ORIGIN_LATITUDE;
  const sLat = lat + ORIGIN_LATITUDE;
  const meridionalArc =
    b *
    f0 *
    ((1 + n + (5 / 4) * n2 + (5 / 4) * n3) * dLat -
      (3 * n + 3 * n2 + (21 / 8) * n3) * Math.sin(dLat) * Math.cos(sLat) +
      ((15 / 8) * n2 + (15 / 8) * n3) *
        Math.sin(2 * dLat) *
        Math.cos(2 * sLat) -
      (35 / 24) * n3 * Math.sin(3 * dLat) * Math.cos(3 * sLat));

  const i = meridionalArc + FALSE_NORTHING;
  const ii = (nu / 2) * sin * cos;
  const iii = (nu / 24) * sin * cos ** 3 * (5 - tan2 + 9 * eta2);
  const iiiA = (nu / 720) * sin * cos ** 5 * (61 - 58 * tan2 + tan2 * tan2);
  const iv = nu * cos;
  const v = (nu / 6) * cos ** 3 * (nu / rho - tan2);
  const vi =
    (nu / 120) *
    cos ** 5 *
    (5 - 18 * tan2 + tan2 * tan2 + 14 * eta2 - 58 * tan2 * eta2);

  const dLng = lng - ORIGIN_LONGITUDE;
  return {
    easting: FALSE_EASTING + iv * dLng + v * dLng ** 3 + vi * dLng ** 5,
    northing: i + ii * dLng ** 2 + iii * dLng ** 4 + iiiA * dLng ** 6,
  };
}

/** British National Grid position of a WGS84 coordinate, in metres. */
export function toNationalGrid(coordinate: Coordinate): GridReference {
  const { lat, lng } = toOsgb36(coordinate);
  return projectOsgb36(lat, lng);
}
