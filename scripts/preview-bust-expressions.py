"""Static QA of five aligned bust maps; writes only /tmp/opencode/.

Run after python scripts/build-bust-expressions.py && node scripts/derive-bust-lods.mjs.
"""
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = Path("/tmp/opencode/bust-expressions-phase3")
sys.dont_write_bytecode = True
for module_name, script in (
    ("bust_preview", "preview-bust-aspect.py"),
    ("bust_build", "build-bust-expressions.py"),
):
    spec = importlib.util.spec_from_file_location(module_name, ROOT / "scripts" / script)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    globals()[module_name] = module

ORDER = ("neutral", "thinking", "angry", "disgust", "smile")
COLORS = bust_preview.BACKGROUND
GLYPHS = bust_preview.GLYPHS
FONT_PATH = subprocess.check_output(["fc-match", "-f", "%{file}", "monospace"], text=True).strip()
FONT = ImageFont.truetype(FONT_PATH, bust_preview.FONT_SIZE)
GLYPH_WIDTH = ImageDraw.Draw(Image.new("RGB", (32, 32))).textlength("M", font=FONT)
LINE_HEIGHT = GLYPH_WIDTH * bust_preview.CELL[1] / bust_preview.CELL[0]


def rows(path, variable):
    text = path.read_text()
    start = text.index(f"export const {variable} = ") + len(f"export const {variable} = ")
    return json.JSONDecoder().raw_decode(text[start:])[0]


def labeled(image, label):
    panel = Image.new("RGB", (image.width, image.height + 36), COLORS)
    panel.paste(image, (0, 36))
    ImageDraw.Draw(panel).text((10, 8), label, fill="#dcdcde", font=FONT)
    return panel


def beside(images):
    gap = 14
    result = Image.new("RGB", (sum(im.width for im in images) + gap * (len(images) - 1),
                               max(im.height for im in images)), COLORS)
    x = 0
    for im in images:
        result.paste(im, (x, 0))
        x += im.width + gap
    return result


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    box, _, _ = bust_preview.grid_geometry()
    art = {}
    counts = {}
    for expression in ORDER:
        suffix = "test" if expression == "neutral" else expression
        fine = rows(ROOT / f"src/components/hero-portrait-rows-variant-bust-{suffix}.ts", "portraitRows")
        lods = ROOT / f"src/components/hero-portrait-lods-variant-bust-{suffix}.ts"
        medium = rows(lods, "mediumPortraitRows")
        coarse = rows(lods, "coarsePortraitRows")
        for lines, width, height in ((fine, 216, 180), (medium, 108, 90), (coarse, 54, 45)):
            assert len(lines) == height and all(len(line) == width for line in lines)
            assert all(char in GLYPHS for line in lines for char in line)
        counts[expression] = {
            "fine": sum(c != " " for line in fine for c in line),
            "medium": sum(c != " " for line in medium for c in line),
            "coarse": sum(c != " " for line in coarse for c in line),
        }
        art[expression] = bust_preview.render_ascii(fine, FONT, GLYPH_WIDTH, LINE_HEIGHT)
        art[expression].save(OUT / f"{expression}-fine.png")
        photo = ImageOps.exif_transpose(Image.open(bust_build.SOURCES / bust_build.PHOTOS[expression])).convert("RGBA")
        crop = bust_build.aligned_crop(photo, expression, box)
        photoprev = crop.resize((art[expression].width, round(crop.height *
                                  art[expression].width / crop.width)), Image.Resampling.LANCZOS)
        ground = Image.new("RGBA", art[expression].size, COLORS)
        ground.alpha_composite(photoprev)
        beside([labeled(ground.convert("RGB"), f"{expression} / FOTO ALINHADA"),
                labeled(art[expression], f"{expression} / ASCII FINE")]).save(
                    OUT / f"{expression}-photo-vs-ascii.jpg", quality=92)
        layers = [coarse, medium, fine]
        lod_art = []
        for lines, title in zip(layers, ("coarse", "medium", "fine")):
            image = bust_preview.render_ascii(lines, FONT, GLYPH_WIDTH, LINE_HEIGHT)
            if image.size != art[expression].size:
                image = image.resize(art[expression].size, Image.Resampling.BICUBIC)
            lod_art.append(labeled(image, f"{expression} / {title}"))
        beside(lod_art).save(OUT / f"{expression}-lods.jpg", quality=88)
    tiles = [labeled(art[name].resize((440, 600), Image.Resampling.LANCZOS), name)
             for name in ORDER]
    beside(tiles).save(OUT / "five-expressions.jpg", quality=95)
    for name in ORDER[1:]:
        beside([labeled(art["neutral"], "neutral"), labeled(art[name], name)]).save(
            OUT / f"alignment-neutral-vs-{name}.jpg", quality=92)
    frames = [art[name].resize((640, 872), Image.Resampling.LANCZOS)
              for name in (*ORDER, "neutral")]
    frames[0].save(OUT / "five-expressions-static.gif", save_all=True,
                   append_images=frames[1:], duration=800, loop=0, optimize=False)
    (OUT / "occupied-cells.json").write_text(json.dumps(counts, indent=2) + "\n")
    print(json.dumps(counts, indent=2))


if __name__ == "__main__":
    main()
