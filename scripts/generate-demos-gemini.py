"""
Gera as demonstrações da musculação com o modelo de imagem do Gemini, a partir
dos prompts de `doc/prompts-imagens-musculacao.md` (bloco de estilo + um bloco
por exercício). Cada imagem é um retrato 9:16 com três quadros empilhados —
início, meio e fim do movimento — para ler de cima para baixo no celular.

Cada pedido leva duas imagens de referência: o adesivo `exercise-dip_*.png`
para o estilo e `scripts/demo-refs/atleta.jpg` (o Front squat aprovado, de uma pose só)
para o personagem — sem isso cada exercício sai com um atleta diferente.

Não sobrescreve nada em `client/public/demos/`: grava em OUT (padrão
`.demos-gemini/`) para revisão; copiar para o app é um passo à parte.

    GEMINI_API_KEY=... python scripts/generate-demos-gemini.py [musculacao-x-fases.jpg ...]
"""
import base64, io, json, os, re, sys, time, urllib.error, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "doc" / "prompts-imagens-musculacao.md"
DEMOS = ROOT / "client" / "public" / "demos"
OUT = Path(os.environ.get("OUT", ROOT / ".demos-gemini"))
MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3-pro-image")
KEY = os.environ["GEMINI_API_KEY"]
CHARACTER = ROOT / "scripts" / "demo-refs" / "atleta.jpg"  # referência de personagem aprovada
W, H = 900, 1600


def load_prompts():
    text = PROMPTS.read_text(encoding="utf-8")
    style = re.search(r"## Bloco de estilo.*?```text\n(.*?)```", text, re.S)[1].strip()
    items = re.findall(r"### \d+\. .*? — `(musculacao-[^`]+-fases\.jpg)`\n```text\n(.*?)```", text, re.S)
    assert len(items) == 33, f"esperava 33 prompts, achei {len(items)}"
    return style, dict((name, body.strip()) for name, body in items)


def part(path):
    mime = "image/jpeg" if str(path).endswith(".jpg") else "image/png"
    return {"inline_data": {"mime_type": mime, "data": base64.b64encode(Path(path).read_bytes()).decode()}}


def generate(prompt, refs):
    body = {
        "contents": [{"parts": [*map(part, refs), {"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": {"aspectRatio": "9:16"}},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
    )
    for attempt in range(4):
        try:
            data = json.load(urllib.request.urlopen(req, timeout=180))
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 503) or attempt == 3:
                raise SystemExit(f"HTTP {e.code}: {e.read().decode()[:400]}")
            time.sleep(20 * (attempt + 1))
    for p in data["candidates"][0]["content"]["parts"]:
        if "inlineData" in p or "inline_data" in p:
            blob = p.get("inlineData") or p.get("inline_data")
            return Image.open(io.BytesIO(base64.b64decode(blob["data"])))
    raise RuntimeError(f"sem imagem na resposta: {json.dumps(data)[:400]}")


def save(img, name):
    # Retrato W×H, imagem inteira (sem corte).
    img = img.convert("RGB")
    # O modelo às vezes desenha a cena como um cartão sobre moldura clara:
    # corta tudo o que for mais claro que o fundo verde-petróleo.
    gray = img.convert("L")
    w, h = gray.size
    mean = lambda box: sum(gray.crop(box).get_flattened_data()) / ((box[2] - box[0]) * (box[3] - box[1]))
    l, t, r, b = 0, 0, w, h
    while l < w * 0.15 and mean((l, t, l + 1, b)) > 90: l += 1
    while r > w * 0.85 and mean((r - 1, t, r, b)) > 90: r -= 1
    while t < h * 0.15 and mean((l, t, r, t + 1)) > 90: t += 1
    while b > h * 0.85 and mean((l, b - 1, r, b)) > 90: b -= 1
    img = img.crop((l + 2, t + 2, r - 2, b - 2))
    img.thumbnail((W, H), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), img.getpixel((2, 2)))
    canvas.paste(img, ((W - img.width) // 2, (H - img.height) // 2))
    canvas.save(OUT / name, quality=86, optimize=True, progressive=True)


if __name__ == "__main__":
    style, prompts = load_prompts()
    OUT.mkdir(exist_ok=True)
    wanted = sys.argv[1:] or list(prompts)
    style_ref = next(DEMOS.glob("exercise-dip_*.png"))
    order = wanted
    refs = [style_ref, CHARACTER]
    for i, name in enumerate(order, 1):
        if (OUT / name).exists():
            print(f"[{i}/{len(order)}] já existe {name}")
            continue
        # As referências puxam a pose para a delas; o texto tem que mandar mais que a imagem.
        lead = ("Reference images: the first one sets the illustration STYLE only, the second one is the athlete "
                "(keep the exact same face, hair, outfit and proportions). Do not copy their poses, equipment or "
                "layout. Draw one new image of the exercise described below: three stacked panels following the "
                "PHASES, top to bottom. The Body section describes the key position; the PHASES decide each panel.\n\n")
        print(f"[{i}/{len(order)}] gerando {name}")
        save(generate(lead + style + "\n\n" + prompts[name], refs), name)
        time.sleep(3)
    print("pronto:", OUT)
