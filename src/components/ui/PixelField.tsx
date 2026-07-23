"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Lightweight animated pixel-dither field. Every cell is a function of its
 * coordinates and the clock — a demoscene plasma quantised through an ordered
 * (Bayer) dither, upscaled from a tiny buffer with nearest-neighbour so it
 * reads as chunky pixels. Tuned to the flikpik palette.
 *
 * Cheap by design: renders a small cols×rows buffer, pauses when offscreen or
 * when the tab is hidden, and freezes to a single frame under reduced-motion.
 */

type Palette = "ember" | "paper" | "ink";
type FieldKind = "plasma" | "ripple" | "warp";

const PALETTES: Record<Palette, string[]> = {
  // dark → marquee red → warm highlight (for dark bands)
  ember: ["#151015", "#241012", "#4A160F", "#8A2214", "#B8200F", "#E63220", "#F2B49E"],
  // warm paper family with a red lift (subtle, for light surfaces)
  paper: ["#F5F0EB", "#EFE7DE", "#F6E2DB", "#FDDCD8", "#F2C4B7", "#E7A08F"],
  // near-black warm greys (quiet)
  ink: ["#0F0B0E", "#151015", "#211a20", "#2f2630", "#4a3d47", "#6B5A62"],
};

function hexToRgb(h: string): [number, number, number] {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

function buildRamp(stops: string[]): Uint8Array {
  const pts = stops.map(hexToRgb);
  const out = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const f = (i / 255) * (pts.length - 1);
    const a = Math.min(Math.floor(f), pts.length - 2);
    const t = f - a;
    for (let k = 0; k < 3; k++) {
      out[i * 3 + k] = pts[a][k] + (pts[a + 1][k] - pts[a][k]) * t;
    }
  }
  return out;
}

// Bayer 4×4 ordered-dither thresholds.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);

// ── value noise for the warp field ─────────────────────────────────────────
function hash(x: number, y: number, z: number): number {
  let n = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  n = ((n ^ (n >> 13)) * 1274126177) | 0;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
const sstep = (t: number) => t * t * (3 - 2 * t);
function vnoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = sstep(x - xi), yf = sstep(y - yi), zf = sstep(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (i: number, j: number, k: number) => hash(xi + i, yi + j, zi + k);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}
function fbm(x: number, y: number, z: number): number {
  let s = 0, a = 0.5, f = 1;
  for (let o = 0; o < 3; o++) {
    s += a * vnoise(x * f, y * f, z * f);
    f *= 2;
    a *= 0.5;
  }
  return s / 0.875;
}

function fieldFn(kind: FieldKind) {
  if (kind === "ripple") {
    return (u: number, v: number, t: number) => {
      const d = Math.hypot(u * (1 + 0.2 * Math.sin(t * 0.3)), v);
      return Math.sin(d * 9 - t * 1.6) * 0.5 + 0.5;
    };
  }
  if (kind === "warp") {
    return (u: number, v: number, t: number) => {
      const qx = fbm(u * 1.6, v * 1.6, t * 0.15);
      const qy = fbm(u * 1.6 + 5.2, v * 1.6 + 1.3, t * 0.15);
      return fbm(u * 1.6 + 3 * qx, v * 1.6 + 3 * qy, t * 0.1);
    };
  }
  // plasma — pure sines, cheapest, great behind text
  return (u: number, v: number, t: number) => {
    const a = Math.sin(u * 3 + t);
    const b = Math.sin(3 * (u * Math.sin(t / 2) + v * Math.cos(t / 3)) + t);
    const cx = u + 0.5 * Math.sin(t / 5);
    const cy = v + 0.5 * Math.cos(t / 3);
    const c = Math.sin(Math.sqrt(40 * (cx * cx + cy * cy) + 1) + t);
    return (a + b + c) / 6 + 0.5;
  };
}

export function PixelField({
  palette = "ember",
  field = "plasma",
  cell = 12,
  levels = 6,
  speed = 0.5,
  className = "",
  style,
}: {
  palette?: Palette;
  field?: FieldKind;
  cell?: number;
  levels?: number;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const buf = document.createElement("canvas");
    const bctx = buf.getContext("2d", { alpha: false });
    if (!bctx) return;
    ctx.imageSmoothingEnabled = false;

    const ramp = buildRamp(PALETTES[palette]);
    const fn = fieldFn(field);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cols = 1, rows = 1;
    let img: ImageData | null = null;
    let raf = 0;
    let running = false;
    let visible = true;
    let t = 0;
    let last = performance.now();

    const MAX_CELLS = 24000; // keep the buffer small

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas!.width = w;
      canvas!.height = h;
      cols = Math.max(1, Math.ceil(w / cell));
      rows = Math.max(1, Math.ceil(h / cell));
      // clamp total cells for cheapness
      if (cols * rows > MAX_CELLS) {
        const s = Math.sqrt((cols * rows) / MAX_CELLS);
        cols = Math.max(1, Math.floor(cols / s));
        rows = Math.max(1, Math.floor(rows / s));
      }
      buf.width = cols;
      buf.height = rows;
      img = bctx!.createImageData(cols, rows);
      ctx!.imageSmoothingEnabled = false;
      draw();
    }

    function draw() {
      if (!img) return;
      const d = img.data;
      const aspect = cols / rows;
      const L = levels;
      let p = 0;
      for (let y = 0; y < rows; y++) {
        const v = (y / rows) * 2 - 1;
        const brow = (y & 3) * 4;
        for (let x = 0; x < cols; x++) {
          const u = ((x / cols) * 2 - 1) * aspect;
          let n = fn(u, v, t);
          n = n < 0 ? 0 : n > 1 ? 1 : n;
          const bias = BAYER[brow + (x & 3)] - 0.5;
          let q = Math.round(n * (L - 1) + bias) / (L - 1);
          q = q < 0 ? 0 : q > 1 ? 1 : q;
          const i = ((q * 255) | 0) * 3;
          d[p++] = ramp[i];
          d[p++] = ramp[i + 1];
          d[p++] = ramp[i + 2];
          d[p++] = 255;
        }
      }
      bctx!.putImageData(img, 0, 0);
      ctx!.drawImage(buf, 0, 0, cols, rows, 0, 0, canvas!.width, canvas!.height);
    }

    function loop(now: number) {
      if (!running) return;
      t += ((now - last) / 1000) * speed;
      last = now;
      draw();
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduce || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    const onVisibility = () => (document.hidden ? stop() : start());
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    document.addEventListener("visibilitychange", onVisibility);

    resize();
    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [palette, field, cell, levels, speed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
    />
  );
}
