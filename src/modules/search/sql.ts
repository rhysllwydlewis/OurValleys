import { sql } from "drizzle-orm";

export function publicBusinessRadiusCondition(input: {
  longitude: number;
  latitude: number;
  radiusMetres: number;
}) {
  return sql`
    ST_DWithin(
      place.coordinate,
      ST_SetSRID(
        ST_MakePoint(${input.longitude}, ${input.latitude}),
        4326
      )::geography,
      ${input.radiusMetres}
    )
  `;
}
