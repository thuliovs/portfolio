"""Generate an ASCII portrait from a Nikon JPEG or its head-only edit.

One-time local tool; never copy the photos or segmentation model to public/.
Install in an external venv:
  uv venv /tmp/opencode/portrait-venv
  uv pip install --python /tmp/opencode/portrait-venv/bin/python 'rembg[cpu]' pillow numpy
  /tmp/opencode/portrait-venv/bin/python scripts/prepare-ascii-portrait.py \
    --input /path/to/editadas/_DSC2311.JPG \
    --mask-source /path/to/_DSC2311.JPG

For additional photos, set --name to avoid overwriting the neutral assets,
and pass the eye coordinates measured on that EXIF-upright full-size photo.

The mask source must be the same image, at the same upright dimensions and
pixel alignment, before the background was edited. It protects the curls from
the gray halo left in the edit. Eye coordinates refer to upright full-size
pixels, not the thumbnail. Change them for future expressions.
"""

import argparse
import json
import math
import re
from pathlib import Path
from xml.sax.saxutils import escape

import numpy as np
from PIL import Image, ImageChops, ImageFilter, ImageOps
from rembg import new_session, remove


ROOT = Path(__file__).resolve().parent.parent
GLYPHS = " .:-=+*#%@"
COLUMNS = 160
ROWS = 140
CELL_WIDTH = 4.375
CELL_HEIGHT = 7.14
# Eyes are expressed in pixels on the upright 3264 × 4928 photo.
LEFT_EYE = (1115, 2265)
RIGHT_EYE = (1900, 2265)
# Crop tightly around the entire head (hair to beard), not the neck/shoulders.
# Eye midpoint at (0.5, 0.5); interocular distance = 0.32 of width.
EYE_X = 0.5
EYE_Y = 0.5
EYE_SPACING = 0.32
ASPECT = 0.7  # full head crop, before the viewport hides its right side


def portrait_rows(
    source: Path,
    mask_source: Path | None,
    left_eye: tuple[int, int],
    right_eye: tuple[int, int],
):
    original = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    # Segment at bounded resolution; all expensive work happens locally.
    source_size = original.size
    original.thumbnail((1100, 1500), Image.Resampling.LANCZOS)
    scale = original.width / source_size[0]  # eyes refer to the upright original
    center_x = (left_eye[0] + right_eye[0]) / 2 * scale
    center_y = (left_eye[1] + right_eye[1]) / 2 * scale
    angle = math.degrees(
        math.atan2(right_eye[1] - left_eye[1], right_eye[0] - left_eye[0])
    )

    session = new_session("u2net")
    mask = remove(original, session=session, only_mask=True).convert("L")
    if mask_source is not None:
        reference = ImageOps.exif_transpose(Image.open(mask_source)).convert("RGB")
        if reference.size != source_size:
            raise ValueError("Mask source must have the same upright dimensions as input")
        reference.thumbnail((1100, 1500), Image.Resampling.LANCZOS)
        reference_mask = remove(reference, session=session, only_mask=True).convert("L")
        # Edited photo: removes the body. Unedited photo: tracks the *actual*
        # curls rather than the edit's residual gray backdrop around them.
        mask = ImageChops.darker(mask, reference_mask)
    if angle:
        center = (center_x, center_y)
        original = original.rotate(angle, center=center, resample=Image.Resampling.BICUBIC)
        mask = mask.rotate(angle, center=center, resample=Image.Resampling.BICUBIC)

    eye_distance = math.dist(left_eye, right_eye) * scale
    crop_width = eye_distance / EYE_SPACING
    crop_height = crop_width / ASPECT
    crop = (
        round(center_x - EYE_X * crop_width),
        round(center_y - EYE_Y * crop_height),
        round(center_x + (1 - EYE_X) * crop_width),
        round(center_y + (1 - EYE_Y) * crop_height),
    )
    # Keep the entire original through segmentation and alignment; crop only
    # when preparing this final hero asset.
    original = original.crop(crop).resize(
        (COLUMNS * 4, ROWS * 4), Image.Resampling.LANCZOS
    )
    mask = mask.crop(crop).resize(
        (COLUMNS * 4, ROWS * 4), Image.Resampling.LANCZOS
    )
    gray = ImageOps.grayscale(original)
    # Gentle shadow lift + local contrast make eyes, beard and curls readable
    # after downsampling, without replacing or inventing facial features.
    pixels = np.asarray(gray, dtype=np.float32) / 255
    pixels = np.power(pixels, 0.83)
    local = np.asarray(
        Image.fromarray(np.uint8(pixels * 255))
        .filter(ImageFilter.GaussianBlur(6)),
        dtype=np.float32,
    ) / 255
    pixels = np.clip(pixels + (pixels - local) * 0.85, 0, 1)
    gray = Image.fromarray(np.uint8(pixels * 255), "L")

    # Average each character cell rather than sampling one potentially noisy pixel.
    gray = np.asarray(
        gray.resize((COLUMNS, ROWS), Image.Resampling.BOX), dtype=np.float32
    ) / 255
    alpha = np.asarray(
        mask.resize((COLUMNS, ROWS), Image.Resampling.BOX), dtype=np.float32
    ) / 255
    if mask_source is None:
        # With an unedited source, U²-Net segments the entire person; keep the
        # jaw/beard only. The edited head uses its true boundary instead.
        for y in range(ROWS):
            position = y / ROWS
            if position < 0.77:
                continue
            jaw_radius = np.interp(
                position,
                [0.77, 0.85, 0.90, 0.95, 0.985],
                [0.48, 0.32, 0.25, 0.18, 0.08],
            )
            for x in range(COLUMNS):
                distance = abs((x + 0.5) / COLUMNS - 0.5)
                edge = np.clip((jaw_radius - distance) / 0.02, 0, 1)
                bottom = np.clip((0.985 - position) / 0.025, 0, 1)
                alpha[y, x] *= edge * bottom
    result = []
    for y in range(ROWS):
        line = []
        for x in range(COLUMNS):
            if alpha[y, x] < 0.28:
                line.append(" ")
                continue
            darkness = 1 - gray[y, x]
            # A small tone lift prevents the matte of mid-tone skin from
            # overpowering the actual high-contrast facial features.
            strength = max(0, (darkness - 0.10) / 0.90) * min(1, alpha[y, x] * 1.2)
            # Let the face lead: subdue the large dark hair mass.
            if y < ROWS * 0.39:
                strength *= 0.78
            index = min(len(GLYPHS) - 1, round(strength * (len(GLYPHS) - 1)))
            line.append(GLYPHS[index])
        result.append("".join(line))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="Nikon JPEG or head-only edit")
    parser.add_argument(
        "--mask-source", type=Path, help="Aligned unedited JPEG for curl contours"
    )
    parser.add_argument(
        "--name", default="neutral", help="Asset name (default: neutral)"
    )
    parser.add_argument("--left-eye", type=int, nargs=2, default=LEFT_EYE)
    parser.add_argument("--right-eye", type=int, nargs=2, default=RIGHT_EYE)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.name):
        parser.error("--name must contain lowercase letters, digits or hyphens")

    rows = portrait_rows(
        args.input, args.mask_source, tuple(args.left_eye), tuple(args.right_eye)
    )
    data_name = "hero-portrait-rows" if args.name == "neutral" else f"hero-portrait-rows-{args.name}"
    data_file = ROOT / f"src/components/{data_name}.ts"
    svg_file = ROOT / f"public/portraits/{args.name}-ascii.svg"
    svg_file.parent.mkdir(parents=True, exist_ok=True)
    data_file.write_text(
        "// Generated by scripts/prepare-ascii-portrait.py — do not hand-edit.\n"
        f"// Source: {args.input.parent.name}/{args.input.name}; "
        f"mask: {args.mask_source.name if args.mask_source else 'same image'}; "
        f"eyes: {tuple(args.left_eye)}, {tuple(args.right_eye)} (upright pixels).\n"
        f"export const portraitRows = {json.dumps(rows, ensure_ascii=True, indent=2)};\n"
        f"export const portraitCell = {{ width: {CELL_WIDTH}, height: {CELL_HEIGHT} }};\n"
    )
    svg_lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{COLUMNS * CELL_WIDTH:g}" height="{ROWS * CELL_HEIGHT:g}" viewBox="0 0 {COLUMNS * CELL_WIDTH:g} {ROWS * CELL_HEIGHT:g}" role="img">',
        f'<g fill="#dcdcde" fill-opacity=".78" font-family="monospace" font-size="{CELL_HEIGHT:g}" font-weight="500" xml:space="preserve">',
    ]
    for y, row in enumerate(rows):
        if row.strip():
            svg_lines.append(
                f'<text x="0" y="{(y + 1) * CELL_HEIGHT:g}">{escape(row.rstrip())}</text>'
            )
    svg_lines.extend(["</g>", "</svg>"])
    svg_file.write_text("\n".join(svg_lines) + "\n")
    print(f"Generated {data_file} and {svg_file}; original untouched.")


if __name__ == "__main__":
    main()
