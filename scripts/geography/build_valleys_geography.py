#!/usr/bin/env python3
"""Bake the static geography behind the valleys map (`/map`).

The map uses no tiles and no map provider at runtime. This script turns open
data into two committed files, so the site never talks to a third party:

  src/data/geography/valleys-geography.json   coast, council areas, rivers,
                                              lakes, main roads and railways
  public/map/valleys-relief.webp              hill shading, woodland and
                                              built-up areas on land and sea

Everything is drawn in one fixed frame of the British National Grid; the
frame is written into the JSON and `src/lib/map-projection.ts` projects place
coordinates into the same frame.

Sources (all Open Government Licence v3.0; see docs/96-valleys-map-geography.md):
  OS Open Rivers, OS Terrain 50, OS VectorMap District (tiles SN SO SS ST)
      https://osdatahub.os.uk/downloads/open
  ONS Local Authority Districts (December 2024) Boundaries UK BGC
      https://geoportal.statistics.gov.uk/

Run (needs Python 3.11+, numpy, Pillow, pyshp):

  python3 scripts/geography/build_valleys_geography.py --data <folder>

`<folder>` holds the unzipped downloads:
  rivers/Data/oprvrs_gb.gpkg
  terrain.zip                      (OS Terrain 50, ASCII grid, as downloaded)
  vmd/<TILE>/**/data/<TILE>_*.shp  (VectorMap District shapefiles)
Council boundaries are fetched from the ONS service and cached in the folder.
"""

from __future__ import annotations

import argparse
import glob
import io
import json
import math
import os
import sqlite3
import struct
import urllib.parse
import urllib.request
import zipfile
from collections import defaultdict

import numpy as np
import shapefile
from PIL import Image, ImageDraw, ImageFilter

# --- The frame -------------------------------------------------------------
# British National Grid metres. Chosen to hold every seeded place with room
# for Swansea Bay, the Bristol Channel coast and the edge of the Beacons.
EAST_MIN, EAST_MAX = 264_000, 336_000
NORTH_MIN, NORTH_MAX = 167_000, 219_000
VIEW_WIDTH = 1000.0
METRES_PER_UNIT = (EAST_MAX - EAST_MIN) / VIEW_WIDTH
VIEW_HEIGHT = (NORTH_MAX - NORTH_MIN) / METRES_PER_UNIT
CLIP_MARGIN = 2_000  # metres drawn beyond the frame so edges never show

RELIEF_WIDTH = 1800  # pixels
# Must match --map-land and --map-sea in valleys-map.module.css.
LAND_COLOUR = (244, 241, 232)
SEA_COLOUR = (212, 228, 232)

TILES = ["SN", "SO", "SS", "ST"]

# The seven council areas OurValleys covers; the rest are drawn as context.
COVERED_COUNCILS = {
    "Rhondda Cynon Taf",
    "Merthyr Tydfil",
    "Caerphilly",
    "Blaenau Gwent",
    "Torfaen",
    "Bridgend",
    "Neath Port Talbot",
}

# Valley place slug -> the watercourse names (OS Open Rivers) that define it.
VALLEY_RIVERS: dict[str, list[str]] = {
    "rhondda-fawr": ["Afon Rhondda"],
    "rhondda-fach": ["Afon Rhondda Fach"],
    "cynon-valley": ["Afon Cynon"],
    "taff-valley": ["River Taff"],
    "ely-valley": ["Afon Elái"],
    "ogmore-valley": ["Ogmore River", "Ogwr Fawr"],
    "garw-valley": ["Afon Garw"],
    "llynfi-valley": ["Afon Llynfi"],
    "afan-valley": ["River Avan"],
    "neath-valley": ["Afon Nedd"],
    "dulais-valley": ["Dulais"],
    "rhymney-valley": ["Rhymney River"],
    "aber-valley": ["Nant yr Aber"],
    "ebbw-valley": ["Ebbw River"],
    "ebbw-fach-valley": ["Ebbw Fach River"],
    "llwyd-valley": ["Afon Lwyd"],
    # The Sirhowy is one river and two valley records: it is split where it
    # leaves Blaenau Gwent for Caerphilly county borough.
    "upper-sirhowy-valley": ["Afon Sirhywi"],
    "sirhowy-valley-caerphilly": ["Afon Sirhywi"],
}
SIRHOWY_SPLIT_NORTHING = 204_500
# "Dulais" names several streams; keep the one that joins the Neath.
DULAIS_BOX = (272_000, 196_000, 286_000, 212_000)


def in_frame(x: float, y: float, margin: float = CLIP_MARGIN) -> bool:
    return (
        EAST_MIN - margin <= x <= EAST_MAX + margin
        and NORTH_MIN - margin <= y <= NORTH_MAX + margin
    )


def to_view(x: float, y: float) -> tuple[float, float]:
    return ((x - EAST_MIN) / METRES_PER_UNIT, (NORTH_MAX - y) / METRES_PER_UNIT)


# --- Geometry helpers ------------------------------------------------------
def simplify(points: list[tuple[float, float]], tolerance: float):
    """Douglas-Peucker, iterative."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        ax, ay = points[first]
        bx, by = points[last]
        dx, dy = bx - ax, by - ay
        length = math.hypot(dx, dy)
        worst, index = 0.0, -1
        for i in range(first + 1, last):
            px, py = points[i]
            if length == 0:
                distance = math.hypot(px - ax, py - ay)
            else:
                distance = abs(dy * px - dx * py + bx * ay - by * ax) / length
            if distance > worst:
                worst, index = distance, i
        if worst > tolerance and index > 0:
            keep[index] = True
            stack.append((first, index))
            stack.append((index, last))
    return [point for point, kept in zip(points, keep) if kept]


def chain(lines: list[list[tuple[float, float]]]):
    """Join polylines that share an end point into longer ones."""
    key = lambda p: (round(p[0], 1), round(p[1], 1))
    ends: dict[tuple[float, float], list[int]] = defaultdict(list)
    for index, line in enumerate(lines):
        ends[key(line[0])].append(index)
        ends[key(line[-1])].append(index)
    used = [False] * len(lines)
    result = []
    for start in range(len(lines)):
        if used[start]:
            continue
        used[start] = True
        current = list(lines[start])
        for _ in range(2):  # grow the tail, then flip and grow again
            while True:
                candidates = [
                    i for i in ends[key(current[-1])] if not used[i]
                ]
                # Only pass through a plain join; stop at a real junction.
                if len(ends[key(current[-1])]) != 2 or not candidates:
                    break
                nxt = candidates[0]
                used[nxt] = True
                line = lines[nxt]
                if key(line[0]) != key(current[-1]):
                    line = line[::-1]
                current.extend(line[1:])
            current.reverse()
        result.append(current)
    return result


def split_to_frame(line):
    """Cut a polyline into the runs that sit inside the padded frame."""
    runs, run = [], []
    for point in line:
        if in_frame(*point):
            run.append(point)
        else:
            if len(run) > 1:
                runs.append(run)
            run = []
    if len(run) > 1:
        runs.append(run)
    return runs


def clip_ring(ring):
    """Sutherland-Hodgman clip of a ring to the padded frame."""
    edges = [
        (0, EAST_MIN - CLIP_MARGIN, 1),
        (0, EAST_MAX + CLIP_MARGIN, -1),
        (1, NORTH_MIN - CLIP_MARGIN, 1),
        (1, NORTH_MAX + CLIP_MARGIN, -1),
    ]
    output = ring
    for axis, bound, sign in edges:
        if not output:
            break
        source, output = output, []
        inside = lambda p: (p[axis] - bound) * sign >= 0
        for i, current in enumerate(source):
            previous = source[i - 1]
            if inside(current) != inside(previous):
                t = (bound - previous[axis]) / (current[axis] - previous[axis])
                output.append(
                    (
                        previous[0] + t * (current[0] - previous[0]),
                        previous[1] + t * (current[1] - previous[1]),
                    )
                )
            if inside(current):
                output.append(current)
    return output


def ring_area(ring) -> float:
    return abs(
        sum(
            ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1]
            for i in range(len(ring))
        )
        / 2
    )


def path_data(lines, closed=False, tolerance=0.25) -> str:
    """Compact SVG path in view units: absolute start, relative steps."""
    parts = []
    for line in lines:
        points = simplify([to_view(*p) for p in line], tolerance)
        if len(points) < (3 if closed else 2):
            continue
        x, y = round(points[0][0], 1), round(points[0][1], 1)
        part = [f"M{fmt(x)} {fmt(y)}l"]
        steps = []
        for px, py in points[1:]:
            nx, ny = round(px, 1), round(py, 1)
            if nx == x and ny == y:
                continue
            steps.append(f"{fmt(round(nx - x, 1))} {fmt(round(ny - y, 1))}")
            x, y = nx, ny
        if not steps:
            continue
        part.append(" ".join(steps))
        if closed:
            part.append("z")
        parts.append("".join(part))
    return "".join(parts)


def fmt(value: float) -> str:
    text = f"{value:.1f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def line_length(line) -> float:
    return sum(
        math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1])
        for i in range(1, len(line))
    )


def chaikin(points, rounds=2):
    for _ in range(rounds):
        smoothed = [points[0]]
        for a, b in zip(points, points[1:]):
            smoothed.append((a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25))
            smoothed.append((a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75))
        smoothed.append(points[-1])
        points = smoothed
    return points


# --- Sources ---------------------------------------------------------------
def read_shapes(data: str, layer: str, encoding="latin-1"):
    for tile in TILES:
        matches = glob.glob(
            os.path.join(data, "vmd", tile, "**", f"{tile}_{layer}.shp"),
            recursive=True,
        )
        if not matches:
            raise SystemExit(f"Missing VectorMap District layer {tile}_{layer}")
        reader = shapefile.Reader(matches[0], encoding=encoding)
        frame = (
            EAST_MIN - CLIP_MARGIN,
            NORTH_MIN - CLIP_MARGIN,
            EAST_MAX + CLIP_MARGIN,
            NORTH_MAX + CLIP_MARGIN,
        )
        for item in reader.iterShapeRecords(bbox=frame):
            yield item.shape, item.record


def shape_parts(shape):
    bounds = list(shape.parts) + [len(shape.points)]
    return [
        [(float(x), float(y)) for x, y in shape.points[a:b]]
        for a, b in zip(bounds, bounds[1:])
    ]


def read_rivers(data: str):
    """Named watercourse links inside the frame, grouped by name."""
    connection = sqlite3.connect(
        os.path.join(data, "rivers", "Data", "oprvrs_gb.gpkg")
    )
    by_name: dict[str, list[list[tuple[float, float]]]] = defaultdict(list)
    alternative: dict[str, str] = {}
    query = (
        "select geometry, watercourse_name, watercourse_name_alternative, form "
        "from watercourse_link where watercourse_name is not null"
    )
    for blob, name, other, form in connection.execute(query):
        if form == "canal":
            continue
        flags = blob[3]
        header = 8 + [0, 32, 48, 48, 64][(flags >> 1) & 7]
        wkb = blob[header:]
        order = "<" if wkb[0] == 1 else ">"
        kind, count = struct.unpack(order + "II", wkb[1:9])
        dims = 3 if kind in (1002, 0x80000002) else 2
        values = struct.unpack(
            f"{order}{count * dims}d", wkb[9 : 9 + count * dims * 8]
        )
        line = [(values[i], values[i + 1]) for i in range(0, len(values), dims)]
        if not any(in_frame(*point) for point in line):
            continue
        by_name[name].append(line)
        if other:
            alternative[name] = other
    return by_name, alternative


def read_councils(data: str):
    cache = os.path.join(data, "councils.geojson")
    if not os.path.exists(cache):
        base = (
            "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/"
            "Local_Authority_Districts_December_2024_Boundaries_UK_BGC/"
            "FeatureServer/0/query?"
        )
        query = urllib.parse.urlencode(
            {
                "where": "1=1",
                "geometry": f"{EAST_MIN},{NORTH_MIN},{EAST_MAX},{NORTH_MAX}",
                "geometryType": "esriGeometryEnvelope",
                "inSR": 27700,
                "outSR": 27700,
                "spatialRel": "esriSpatialRelIntersects",
                "outFields": "LAD24CD,LAD24NM,LAD24NMW",
                "f": "geojson",
            }
        )
        with urllib.request.urlopen(base + query, timeout=120) as response:
            body = response.read()
        with open(cache, "wb") as handle:
            handle.write(body)
    with open(cache, encoding="utf-8") as handle:
        return json.load(handle)["features"]


def read_terrain(data: str) -> np.ndarray:
    """Elevation mosaic for the frame at 50 m, north at the top."""
    cell = 50
    cols = (EAST_MAX - EAST_MIN) // cell
    rows = (NORTH_MAX - NORTH_MIN) // cell
    grid = np.zeros((rows, cols), dtype=np.float32)
    letters = {"SN": (200_000, 200_000), "SO": (300_000, 200_000),
               "SS": (200_000, 100_000), "ST": (300_000, 100_000)}
    with zipfile.ZipFile(os.path.join(data, "terrain.zip")) as outer:
        names = {os.path.basename(n)[:4].upper(): n for n in outer.namelist()
                 if n.endswith(".zip")}
        for prefix, (east0, north0) in letters.items():
            for ei in range(10):
                for ni in range(10):
                    east, north = east0 + ei * 10_000, north0 + ni * 10_000
                    if (east + 10_000 <= EAST_MIN or east >= EAST_MAX
                            or north + 10_000 <= NORTH_MIN or north >= NORTH_MAX):
                        continue
                    name = names.get(f"{prefix}{ei}{ni}")
                    if not name:
                        continue  # open sea
                    with zipfile.ZipFile(io.BytesIO(outer.read(name))) as inner:
                        asc = next(n for n in inner.namelist() if n.endswith(".asc"))
                        text = inner.read(asc).decode("ascii")
                    lines = text.split("\n")
                    tile = np.array(
                        " ".join(lines[5:]).split(), dtype=np.float32
                    ).reshape(200, 200)
                    for r in range(200):
                        y = north + 10_000 - (r + 1) * cell
                        gr = (NORTH_MAX - y) // cell - 1
                        if not 0 <= gr < rows:
                            continue
                        c0 = (east - EAST_MIN) // cell
                        a, b = max(c0, 0), min(c0 + 200, cols)
                        if a < b:
                            grid[gr, a:b] = tile[r, a - c0 : b - c0]
    return grid


# --- Layers ----------------------------------------------------------------
def build_councils(features):
    councils = []
    for feature in features:
        geometry = feature["geometry"]
        polygons = (
            [geometry["coordinates"]]
            if geometry["type"] == "Polygon"
            else geometry["coordinates"]
        )
        rings = []
        for polygon in polygons:
            for ring in polygon:
                clipped = clip_ring([(float(x), float(y)) for x, y, *_ in ring])
                if len(clipped) >= 3 and ring_area(clipped) > 40_000:
                    rings.append(clipped)
        if not rings:
            continue
        properties = feature["properties"]
        name = properties["LAD24NM"]
        councils.append(
            {
                "name": name,
                "welshName": (properties.get("LAD24NMW") or "").strip() or None,
                "covered": name in COVERED_COUNCILS,
                "rings": rings,
            }
        )
    councils.sort(key=lambda c: (not c["covered"], c["name"]))
    return councils


def valley_lines(slug: str, names, by_name):
    lines = [line for name in names for line in by_name.get(name, [])]
    if slug == "dulais-valley":
        x0, y0, x1, y1 = DULAIS_BOX
        lines = [
            l for l in lines if all(x0 <= x <= x1 and y0 <= y <= y1 for x, y in l)
        ]
    if "sirhowy" in slug:
        upper = slug == "upper-sirhowy-valley"
        cut = []
        for line in lines:
            run = []
            for point in line:
                if (point[1] >= SIRHOWY_SPLIT_NORTHING) == upper:
                    run.append(point)
                else:
                    if len(run) > 1:
                        cut.append(run)
                    run = []
            if len(run) > 1:
                cut.append(run)
        lines = cut
    return [run for line in lines for run in split_to_frame(line)]


def longest_stem(lines):
    """Greedy longest run through joined links, for the label to follow."""
    key = lambda p: (round(p[0], 1), round(p[1], 1))
    remaining = [list(l) for l in lines]
    remaining.sort(key=line_length, reverse=True)
    stem = remaining.pop(0)
    grew = True
    while grew:
        grew = False
        for index, line in enumerate(remaining):
            if key(line[0]) == key(stem[-1]):
                stem = stem + line[1:]
            elif key(line[-1]) == key(stem[-1]):
                stem = stem + line[::-1][1:]
            elif key(line[-1]) == key(stem[0]):
                stem = line + stem[1:]
            elif key(line[0]) == key(stem[0]):
                stem = line[::-1] + stem[1:]
            else:
                continue
            remaining.pop(index)
            grew = True
            break
    return stem


def build_rivers(by_name, alternative):
    valleys = []
    used_names = set()
    for slug, names in VALLEY_RIVERS.items():
        lines = valley_lines(slug, names, by_name)
        if not lines:
            raise SystemExit(f"No river found for {slug}: {names}")
        used_names.update(names)
        joined = chain(lines)
        stem = longest_stem(joined)
        view = [to_view(*p) for p in stem]
        spine = chaikin(simplify(view, 5.0), 3)
        if spine[-1][0] < spine[0][0]:
            spine = spine[::-1]
        xs = [to_view(*p)[0] for l in joined for p in l]
        ys = [to_view(*p)[1] for l in joined for p in l]
        valleys.append(
            {
                "slug": slug,
                "path": path_data(joined),
                "spine": "M"
                + " ".join(f"{fmt(round(x, 1))} {fmt(round(y, 1))}" for x, y in spine),
                "bounds": [
                    round(max(min(xs), 0), 1),
                    round(max(min(ys), 0), 1),
                    round(min(max(xs), VIEW_WIDTH), 1),
                    round(min(max(ys), VIEW_HEIGHT), 1),
                ],
            }
        )
    major, minor = [], []
    for name, lines in by_name.items():
        if name in used_names:
            continue
        runs = [run for line in lines for run in split_to_frame(line)]
        total = sum(line_length(run) for run in runs)
        if total >= 12_000:
            major.extend(chain(runs))
        elif total >= 4_500:
            minor.extend(chain(runs))
    return valleys, path_data(major, tolerance=0.35), path_data(minor, tolerance=0.5)


def build_lines(data, layer, classes, tolerance, min_length=0.0):
    lines = []
    for shape, record in read_shapes(data, layer):
        label = record["CLASSIFICA"].split(",")[0]
        if label not in classes:
            continue
        for part in shape_parts(shape):
            lines.extend(split_to_frame(part))
    joined = [l for l in chain(lines) if line_length(l) >= min_length]
    return path_data(joined, tolerance=tolerance)


def build_lakes(data):
    rings = []
    for shape, _ in read_shapes(data, "SurfaceWater_Area"):
        parts = shape_parts(shape)
        if not parts:
            continue
        outer = parts[0]
        area = ring_area(outer)
        perimeter = line_length(outer)
        # Reservoirs, lakes and docks; long thin river polygons are left to
        # the river lines.
        if area >= 90_000 and area / (perimeter * perimeter) >= 0.012:
            rings.extend(r for r in (clip_ring(p) for p in parts) if len(r) >= 3)
    return path_data(rings, closed=True, tolerance=0.3)


def build_relief(data, councils, out_path):
    width = RELIEF_WIDTH
    height = round(width * VIEW_HEIGHT / VIEW_WIDTH)
    scale = width / (EAST_MAX - EAST_MIN)  # pixels per metre

    def pixel(point):
        return ((point[0] - EAST_MIN) * scale, (NORTH_MAX - point[1]) * scale)

    def raster(polygons, supersample=2):
        image = Image.new("L", (width * supersample, height * supersample), 0)
        draw = ImageDraw.Draw(image)
        for ring in polygons:
            if len(ring) >= 3:
                draw.polygon(
                    [(x * supersample, y * supersample) for x, y in map(pixel, ring)],
                    fill=255,
                )
        return image.resize((width, height), Image.LANCZOS)

    land = np.asarray(
        raster([ring for council in councils for ring in council["rings"]]),
        dtype=np.float32,
    ) / 255

    elevation = read_terrain(data)
    smooth = Image.fromarray(elevation, mode="F").resize(
        (width, height), Image.BICUBIC
    )
    z = np.asarray(smooth, dtype=np.float32)
    metres_per_pixel = 1 / scale
    dy, dx = np.gradient(z * 2.2, metres_per_pixel)
    slope = np.arctan(np.hypot(dx, dy))
    aspect = np.arctan2(dy, -dx)
    shade = np.zeros_like(z)
    # A main light from the north-west with two softer fills, so both sides
    # of a north-south valley keep some shape.
    for azimuth, weight in ((315, 0.6), (270, 0.2), (0, 0.2)):
        az = math.radians(360 - azimuth + 90)
        alt = math.radians(45)
        shade += weight * (
            math.sin(alt) * np.cos(slope)
            + math.cos(alt) * np.sin(slope) * np.cos(az - aspect)
        )
    flat = math.sin(math.radians(45))
    delta = shade - flat

    def polygons_of(layer, min_area=0.0):
        for shape, _ in read_shapes(data, layer):
            parts = shape_parts(shape)
            if parts and ring_area(parts[0]) >= min_area:
                yield parts[0]

    woodland = np.asarray(raster(polygons_of("Woodland", 15_000)), np.float32) / 255
    built = raster(polygons_of("Building"))
    built = built.filter(ImageFilter.GaussianBlur(1.6))
    # Isolated farm buildings fade out; streets of houses read as a town.
    built = np.clip((np.asarray(built, np.float32) / 255 - 0.1) * 3.4, 0, 1)

    # Straight-alpha "over" compositing of translucent layers, bottom to top.
    rgb = np.zeros((height, width, 3), np.float32)
    alpha = np.zeros((height, width), np.float32)

    def over(colour, a):
        nonlocal rgb, alpha
        a = np.clip(a, 0, 1)
        out = a + alpha * (1 - a)
        safe = np.where(out > 0, out, 1)
        colour = np.array(colour, np.float32) / 255
        rgb = (
            colour[None, None, :] * a[..., None]
            + rgb * (alpha * (1 - a))[..., None]
        ) / safe[..., None]
        alpha = out

    high = np.clip((z - 300) / 350, 0, 1)
    over((150, 128, 84), high * 0.16)  # open moorland on the tops
    over((58, 122, 84), woodland * 0.3)
    over((116, 104, 92), built * 0.5)
    over((16, 32, 26), np.clip(-delta * 1.25, 0, 0.5))
    over((255, 255, 255), np.clip(delta * 1.1, 0, 0.3))
    # Flatten onto the map's own land and sea colours (the site has one light
    # theme), which compresses far better than a translucent image.
    land_colour = np.array(LAND_COLOUR, np.float32) / 255
    sea_colour = np.array(SEA_COLOUR, np.float32) / 255
    shaded = rgb * alpha[..., None] + land_colour * (1 - alpha[..., None])
    flat_rgb = shaded * land[..., None] + sea_colour * (1 - land[..., None])
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    Image.fromarray(
        (flat_rgb * 255).round().clip(0, 255).astype(np.uint8), "RGB"
    ).save(out_path, "WEBP", quality=64, method=6)
    return width, height


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument(
        "--out", default=os.path.join(os.path.dirname(__file__), "..", "..")
    )
    args = parser.parse_args()
    root = os.path.abspath(args.out)

    councils = build_councils(read_councils(args.data))
    by_name, alternative = read_rivers(args.data)
    valleys, rivers_major, rivers_minor = build_rivers(by_name, alternative)
    relief_w, relief_h = build_relief(
        args.data, councils, os.path.join(root, "public", "map", "valleys-relief.webp")
    )

    geography = {
        "attribution": (
            "Contains OS data © Crown copyright and database right 2026. "
            "Source: Office for National Statistics licensed under the Open "
            "Government Licence v3.0."
        ),
        "frame": {
            "eastMin": EAST_MIN,
            "northMax": NORTH_MAX,
            "metresPerUnit": METRES_PER_UNIT,
            "width": VIEW_WIDTH,
            "height": round(VIEW_HEIGHT, 1),
        },
        "relief": {"href": "/map/valleys-relief.webp", "width": relief_w, "height": relief_h},
        "councils": [
            {
                "name": c["name"],
                "welshName": c["welshName"],
                "covered": c["covered"],
                "path": path_data(c["rings"], closed=True, tolerance=0.45),
            }
            for c in councils
        ],
        "lakes": build_lakes(args.data),
        "riversMinor": rivers_minor,
        "riversMajor": rivers_major,
        "valleys": valleys,
        "rail": build_lines(
            args.data, "RailwayTrack", {"Multi Track", "Single Track"}, 0.3, 1_500
        ),
        "roadsA": build_lines(args.data, "Road", {"A Road", "Primary Road"}, 0.45, 1_200),
        "motorway": build_lines(args.data, "Road", {"Motorway"}, 0.3, 500),
    }
    out = os.path.join(root, "src", "data", "geography", "valleys-geography.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(geography, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")
    for key, value in geography.items():
        size = len(json.dumps(value, ensure_ascii=False))
        print(f"{key:12} {size / 1024:7.1f} KB")
    print("relief", os.path.getsize(os.path.join(root, "public", "map", "valleys-relief.webp")) // 1024, "KB")


if __name__ == "__main__":
    main()
