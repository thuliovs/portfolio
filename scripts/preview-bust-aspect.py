"""Phase 1 only: preview an aspect-preserving bust map without changing the hero.

Run: python scripts/preview-bust-aspect.py
Writes candidate data and PNG previews only to /tmp/opencode/bust-aspect/.
Nothing is written to src/, public/, the GIMP PNG or approved portrait assets.
"""

import json
import math
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path.home() / "Pictures/fotosperfil/Câmera/selecionadas/editadas/_DSC2311.png"
OUTPUT = Path("/tmp/opencode/bust-aspect")
APPROVED_MAP = ROOT / "src/components/hero-portrait-rows.ts"
GLYPHS = " .:-=+*#%@"
EYES = ((1115, 2265), (1900, 2265))
CELL = (4.375, 7.14)  # approved ASCII physical cell size
COLS, ROWS = 216, 180  # divisible by four for medium/coarse, not used in hero yet
EYE_ROW = 70
FONT_SIZE = 13
BACKGROUND = "#1c1c1e"


def grid_geometry():
    eye_distance = math.dist(*EYES)
    # Preserve the 160-column reference's 0.32 eye spacing, including its
    # physical pixels-per-cell; expand horizontally to include both shoulders.
    photo_per_col = eye_distance / (160 * 0.32)
    photo_per_row = photo_per_col * CELL[1] / CELL[0]
    crop_width = COLS * photo_per_col
    crop_height = ROWS * photo_per_row
    left = (3264 - crop_width) / 2
    top = EYES[0][1] - EYE_ROW * photo_per_row
    box = (round(left), round(top), round(left + crop_width), round(top + crop_height))
    return box, photo_per_col, photo_per_row


def glyph_map(photo):
    # Only downsample *uniformly* to a bounded working resolution. No
    # 640×720 squeeze, no CSS, no face-only mask and no copied old glyphs.
    work_width = COLS * 4
    work_height = round(photo.height * work_width / photo.width)
    working = photo.resize((work_width, work_height), Image.Resampling.LANCZOS)
    rgb = working.convert("RGB")
    gray = ImageOps.grayscale(rgb)
    pixels = np.asarray(gray, dtype=np.float32) / 255
    pixels = np.power(pixels, 0.83)
    local = np.asarray(
        Image.fromarray(np.uint8(pixels * 255), "L").filter(ImageFilter.GaussianBlur(6)),
        dtype=np.float32,
    ) / 255
    pixels = np.clip(pixels + (pixels - local) * 0.85, 0, 1)
    gray = np.asarray(Image.fromarray(np.uint8(pixels * 255), "L").resize(
        (COLS, ROWS), Image.Resampling.BOX), dtype=np.float32) / 255
    alpha = np.asarray(working.getchannel("A").resize(
        (COLS, ROWS), Image.Resampling.BOX), dtype=np.float32) / 255
    result = []
    for y in range(ROWS):
        line = []
        for x in range(COLS):
            if alpha[y, x] < 0.28:
                line.append(" ")
                continue
            strength = max(0, (1 - gray[y, x] - 0.10) / 0.90) * min(1, alpha[y, x] * 1.2)
            if y < 140 * 0.39:
                strength *= 0.78
            line.append(GLYPHS[min(9, round(strength * 9))])
        result.append("".join(line))
    return result, (work_width, work_height)


def render_ascii(rows, font, cell_width, line_height):
    art = Image.new(
        "RGB", (round(len(rows[0]) * cell_width), round(len(rows) * line_height)),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(art)
    for y, row in enumerate(rows):
        draw.text((0, round(y * line_height - 2)), row, font=font, fill="#dcdcde")
    return art


def label_image(image, label, font):
    header = 44
    canvas = Image.new("RGB", (image.width, image.height + header), BACKGROUND)
    canvas.paste(image, (0, header))
    ImageDraw.Draw(canvas).text((12, 12), label, font=font, fill="#dcdcde")
    return canvas


def side_by_side(left, right):
    gap = 32
    result = Image.new(
        "RGB", (left.width + right.width + gap, max(left.height, right.height)), BACKGROUND)
    result.paste(left, (0, 0))
    result.paste(right, (left.width + gap, 0))
    return result


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = ImageOps.exif_transpose(Image.open(SOURCE)).convert("RGBA")
    if source.size != (3264, 4928):
        raise ValueError("Eye coordinates are calibrated for the 3264 × 4928 GIMP PNG")
    box, photo_per_col, photo_per_row = grid_geometry()
    photo = source.crop(box)
    photo.save(OUTPUT / "foto-recortada-transparente.png")
    new_rows, work_size = glyph_map(photo)
    match = re.search(
        r"export const portraitRows = (\[[\s\S]*?\]);", APPROVED_MAP.read_text())
    if not match:
        raise ValueError("Approved map unavailable")
    old_rows = json.loads(match[1])
    font_path = subprocess.check_output(
        ["fc-match", "-f", "%{file}", "monospace"], text=True).strip()
    font = ImageFont.truetype(font_path, FONT_SIZE)
    glyph_width = ImageDraw.Draw(Image.new("RGB", (32, 32))).textlength("M", font=font)
    line_height = glyph_width * CELL[1] / CELL[0]
    new_art = render_ascii(new_rows, font, glyph_width, line_height)
    old_art = render_ascii(old_rows, font, glyph_width, line_height)
    # A single isotropic scale converts photo pixels to preview pixels.
    factor = new_art.width / photo.width
    photo_preview = photo.resize((new_art.width, round(photo.height * factor)),
                                 Image.Resampling.LANCZOS)
    photo_canvas = Image.new("RGBA", new_art.size, BACKGROUND)
    photo_canvas.alpha_composite(photo_preview, (0, 0))
    photo_rgb = photo_canvas.convert("RGB")
    photo_rgb.save(OUTPUT / "foto-recortada-proporcional.png")
    new_art.save(OUTPUT / "ascii-busto-estatico-proporcional.png")
    side_by_side(
        label_image(photo_rgb, "PNG GIMP / RECORTE SEM STRETCH", font),
        label_image(new_art, "ASCII / 216 x 180 / SEM STRETCH", font),
    ).save(OUTPUT / "foto-vs-ascii.png")
    side_by_side(
        label_image(old_art, "APROVADO / 160 x 140", font),
        label_image(new_art, "CANDIDATO / 216 x 180", font),
    ).save(OUTPUT / "ascii-antigo-vs-busto.png")
    metrics = {
        "source": str(SOURCE), "sourceSize": source.size, "cropBox": box,
        "cropSize": photo.size, "cropAspect": photo.width / photo.height,
        "subjectBoundingBoxAlpha128": source.getchannel("A").point(
            lambda value: 255 if value >= 128 else 0).getbbox(),
        "grid": [COLS, ROWS], "cell": CELL, "cellAspect": CELL[0] / CELL[1],
        "mapAspect": COLS * CELL[0] / (ROWS * CELL[1]),
        "photoPixelsPerCell": [photo_per_col, photo_per_row],
        "workingSize": work_size, "workingAspect": work_size[0] / work_size[1],
        "eyeColumns": [(eye[0] - box[0]) / photo_per_col for eye in EYES],
        "eyeRow": EYE_ROW, "fontGlyphWidth": glyph_width, "previewLineHeight": line_height,
        "previewSize": new_art.size, "photoPreviewSize": photo_preview.size,
    }
    (OUTPUT / "geometry.json").write_text(json.dumps(metrics, indent=2) + "\n")
    (OUTPUT / "candidate-rows.json").write_text(json.dumps(new_rows, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
