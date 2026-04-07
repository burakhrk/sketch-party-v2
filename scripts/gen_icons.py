from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SIZES = [16, 32, 48, 128]
ROOT = Path("public/icons")
ROOT.mkdir(parents=True, exist_ok=True)

try:
    default_font = ImageFont.truetype("arial.ttf", 48)
except Exception:
    default_font = ImageFont.load_default()

for size in SIZES:
    img = Image.new("RGBA", (size, size), (11, 16, 33, 255))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.08)
    outline = max(1, size // 16)
    accent = (78, 201, 176, 255)
    glow = (93, 62, 201, 180)
    draw.rectangle(
        [pad, pad, size - pad - 1, size - pad - 1],
        fill=(16, 24, 48, 255),
        outline=accent,
        width=outline,
    )
    draw.pieslice(
        [pad, pad, size - pad - 1, size - pad - 1],
        200,
        320,
        fill=glow,
    )

    try:
        font_size = int(size * 0.5)
        font = ImageFont.truetype("arial.ttf", font_size)
    except Exception:
        font = default_font

    text = "SP"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2), text, font=font, fill=(235, 245, 255, 255))

    out_path = ROOT / f"icon-{size}.png"
    img.save(out_path)
    print(f"generated {out_path}")
