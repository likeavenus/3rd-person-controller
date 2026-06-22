import {
  TextureLoader,
  SRGBColorSpace,
  CanvasTexture,
  RepeatWrapping,
  LinearMipmapLinearFilter,
  Texture,
} from "three";

const loader = new TextureLoader();

export function planetTexturePath(file: string) {
  return `${import.meta.env.BASE_URL}textures/planets/${file}`;
}

/** Цветная карта (sRGB). */
export function loadColorTexture(file: string): Texture {
  const tex = loader.load(planetTexturePath(file));
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Карта нормалей, сгенерированная из яркости цветной текстуры (Sobel).
 * Считается один раз при загрузке на уменьшенном разрешении ради производительности.
 */
export function loadNormalFromColor(file: string, strength = 2.2, width = 1024): CanvasTexture {
  const placeholder = document.createElement("canvas");
  placeholder.width = placeholder.height = 4;
  const pctx = placeholder.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "rgb(128,128,255)"; // нейтральная нормаль
    pctx.fillRect(0, 0, 4, 4);
  }
  const canvasTex = new CanvasTexture(placeholder);
  canvasTex.wrapS = RepeatWrapping;
  canvasTex.wrapT = RepeatWrapping;
  canvasTex.minFilter = LinearMipmapLinearFilter;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const h = Math.max(2, Math.round((img.height / img.width) * width));
    const src = document.createElement("canvas");
    src.width = width;
    src.height = h;
    const sctx = src.getContext("2d");
    if (!sctx) return;
    sctx.drawImage(img, 0, 0, width, h);
    const data = sctx.getImageData(0, 0, width, h).data;

    const lum = new Float32Array(width * h);
    for (let i = 0; i < width * h; i++) {
      const p = i * 4;
      lum[i] = (data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114) / 255;
    }

    const out = document.createElement("canvas");
    out.width = width;
    out.height = h;
    const octx = out.getContext("2d");
    if (!octx) return;
    const outData = octx.createImageData(width, h);
    const o = outData.data;

    const at = (x: number, y: number) => {
      const xx = (x + width) % width;
      const yy = Math.min(h - 1, Math.max(0, y));
      return lum[yy * width + xx];
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < width; x++) {
        const dx =
          at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
          (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
        const dy =
          at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
          (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));
        let nx = dx * strength;
        let ny = dy * strength;
        let nz = 1.0;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len;
        ny /= len;
        nz /= len;
        const idx = (y * width + x) * 4;
        o[idx] = (nx * 0.5 + 0.5) * 255;
        o[idx + 1] = (ny * 0.5 + 0.5) * 255;
        o[idx + 2] = (nz * 0.5 + 0.5) * 255;
        o[idx + 3] = 255;
      }
    }
    octx.putImageData(outData, 0, 0);
    canvasTex.image = out;
    canvasTex.needsUpdate = true;
  };
  img.src = planetTexturePath(file);

  return canvasTex;
}

/** Процедурная текстура колец Сатурна: радиальные полосы + щель Кассини + альфа. */
export function makeRingTexture(baseColor = "210,190,150"): CanvasTexture {
  const w = 1024;
  const h = 8;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const imageData = ctx.createImageData(w, h);
  const d = imageData.data;
  const [br, bg, bb] = baseColor.split(",").map(Number);

  for (let x = 0; x < w; x++) {
    const t = x / w; // 0 (внутр.) .. 1 (внешн.)
    // Базовая плотность + полосы
    let density = 0.55 + 0.4 * Math.sin(t * 90.0) * Math.sin(t * 23.0);
    density *= 0.7 + 0.3 * Math.sin(t * 200.0);
    // Щель Кассини
    if (t > 0.62 && t < 0.68) density *= 0.15;
    // Края мягко гаснут
    const edge = Math.min(1, t / 0.06) * Math.min(1, (1 - t) / 0.08);
    let alpha = Math.max(0, Math.min(1, density)) * edge;
    alpha = Math.pow(alpha, 0.9);
    const shade = 0.75 + 0.25 * Math.sin(t * 60.0);
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      d[i] = br * shade;
      d[i + 1] = bg * shade;
      d[i + 2] = bb * shade;
      d[i + 3] = alpha * 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Радиальный градиент-«корона» для свечения Солнца. */
export function makeGlowTexture(inner: string, outer: string): CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}
