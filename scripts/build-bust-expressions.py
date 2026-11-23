"""Generate only the four new bust-expression fine maps and SVGs.

Run: python scripts/build-bust-expressions.py
     node scripts/derive-bust-lods.mjs
The approved neutral map, LODs and SVG are verified, never rewritten.
Sources remain the definitive, read-only PNGs in editadas/com-busto/.
"""

import importlib.util
import json
import math
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCES = Path.home() / "Pictures/fotosperfil/Câmera/selecionadas/editadas/com-busto"
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("bust_preview", ROOT / "scripts/preview-bust-aspect.py")
assert spec and spec.loader
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)

# Measured on the five definitive, EXIF-upright 3264 × 4928 PNGs with
# MediaPipe Face Landmarker float16/1 at 816 × 1232. Coordinates are in
# original image pixels. 33 and 263 are the *outer eye corners* (not pupils);
# 168 is the upper nose bridge. No changes to the direction of the gaze.
# Store the measurements here so rebuilding requires only Pillow + NumPy,
# not the temporary landmark detector or its weights.
LANDMARKS = {
    "neutral": {"outerEyes": ((976.8, 2289.4), (2052.4, 2315.2)), "bridge": (1507.0, 2266.4)},
    "thinking": {"outerEyes": ((1176.5, 2009.3), (2241.2, 2079.8)), "bridge": (1713.1, 1990.1)},
    "angry": {"outerEyes": ((969.5, 2182.4), (2039.6, 2177.2)), "bridge": (1490.8, 2157.6)},
    "disgust": {"outerEyes": ((1015.9, 2179.9), (2168.5, 2182.0)), "bridge": (1586.1, 2161.5)},
    "smile": {"outerEyes": ((918.0, 2202.5), (2034.3, 2216.6)), "bridge": (1446.7, 2188.1)},
}
PHOTOS = {
    "neutral": "_DSC2311.png", "thinking": "_DSC2350.png",
    "angry": "_DSC2347.png", "disgust": "_DSC2352.png",
    "smile": "_DSC2341.png",
}
ORDER = ("thinking", "angry", "disgust", "smile")
FIXTURE = ROOT / "scripts/fixtures/bust-aspect-approved-rows.json"
ROWS = ROOT / "src/components"
SVGS = ROOT / "public/portraits"


def geometry(expression):
    ref = LANDMARKS["neutral"]["outerEyes"]
    eyes = LANDMARKS[expression]["outerEyes"]
    dist = math.dist(*ref)
    source_dist = math.dist(*eyes)
    scale = dist / source_dist
    reference_center = tuple((ref[0][i] + ref[1][i]) / 2 for i in (0, 1))
    source_center = tuple((eyes[0][i] + eyes[1][i]) / 2 for i in (0, 1))
    # Rigid XY translation + uniform scale; no rotation because eyebrow
    # movement and squint alter apparent eye slope across expressions.
    displacement = tuple(reference_center[i] - source_center[i] for i in (0, 1))
    bridge = LANDMARKS[expression]["bridge"]
    bridge_after = tuple(reference_center[i] + scale * (bridge[i] - source_center[i]) for i in (0, 1))
    residual = math.dist(bridge_after, LANDMARKS["neutral"]["bridge"])
    return scale, source_center, reference_center, displacement, residual


def aligned_crop(photo, expression, box):
    if expression == "neutral":
        return photo.crop(box)  # Do not resample the approved neutral.
    scale, source_center, reference_center, _, _ = geometry(expression)
    left, top, right, bottom = box
    # PIL affine maps each target *crop* pixel into original source pixels.
    # Dest = neutral_eye_center + scale * (src - expression_eye_center).
    return photo.transform(
        (right - left, bottom - top), Image.Transform.AFFINE,
        (1 / scale, 0, source_center[0] + (left - reference_center[0]) / scale,
         0, 1 / scale, source_center[1] + (top - reference_center[1]) / scale),
        resample=Image.Resampling.BICUBIC, fillcolor=(0, 0, 0, 0),
    )


def svg(rows):
    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="945" height="1285.2" '
        'viewBox="0 0 945 1285.2" role="img">',
        '<g fill="#dcdcde" fill-opacity=".78" font-family="monospace" '
        'font-size="7.14" font-weight="500" xml:space="preserve">',
    ]
    for y, row in enumerate(rows):
        text = row.rstrip()
        if text:
            lines.append(
                f'<text x="0" y="{(y + 1) * 7.14:g}" '
                f'textLength="{len(text) * 4.375:g}" lengthAdjust="spacingAndGlyphs">'
                f"{escape(text)}</text>"
            )
    return "\n".join(lines + ["</g>", "</svg>", ""])


def main():
    box, _, _ = preview.grid_geometry()
    assert box == (-24, 513, 3288, 5017)
    approved = json.loads(FIXTURE.read_text())
    neutral = ImageOps.exif_transpose(Image.open(SOURCES / PHOTOS["neutral"])).convert("RGBA")
    assert neutral.size == (3264, 4928)
    neutral_rows, _ = preview.glyph_map(aligned_crop(neutral, "neutral", box))
    if neutral_rows != approved:
        raise ValueError("Neutral GIMP PNG no longer matches the approved fixture; nothing written")
    metrics = {}
    for expression in ORDER:
        source = ImageOps.exif_transpose(Image.open(SOURCES / PHOTOS[expression])).convert("RGBA")
        if source.size != (3264, 4928):
            raise ValueError(f"Unexpected dimensions in {PHOTOS[expression]}")
        crop = aligned_crop(source, expression, box)
        rows, _ = preview.glyph_map(crop)
        if len(rows) != 180 or any(len(row) != 216 for row in rows):
            raise ValueError(f"Invalid fine grid for {expression}")
        scale, eye_src, eye_ref, translation, bridge_error = geometry(expression)
        metrics[expression] = {
            "source": str(SOURCES / PHOTOS[expression]),
            "outerEyeCenter": eye_src, "referenceOuterEyeCenter": eye_ref,
            "uniformScale": scale, "translationAtEyeCenter": translation,
            "rotationDegrees": 0, "noseBridgeResidualPx": bridge_error,
            "cropBoxInNeutralCoordinates": box,
            "occupiedFine": sum(c != " " for row in rows for c in row),
        }
        (ROWS / f"hero-portrait-rows-variant-bust-{expression}.ts").write_text(
            "// Generated by scripts/build-bust-expressions.py; approved neutral untouched.\n"
            "// 216 × 180; fine cells 4.375 × 7.14.\n"
            f"export const portraitRows = {json.dumps(rows, indent=2)};\n"
        )
        (SVGS / f"variant-bust-{expression}-ascii.svg").write_text(svg(rows))
    # A tracked, reproducible measurement record, never a /tmp-only dependency.
    (ROOT / "scripts/fixtures/bust-expression-alignment.json").write_text(
        json.dumps(metrics, indent=2) + "\n"
    )
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
