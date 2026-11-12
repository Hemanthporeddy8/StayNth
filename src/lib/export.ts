import type { Plan } from "@/types";
import { computeWalls } from "@/lib/plan";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function planBounds(plan: Plan) {
  if (!plan.rooms.length) {
    return { minX: 0, minY: 0, maxX: plan.width, maxY: plan.depth };
  }
  const minX = Math.min(...plan.rooms.map((r) => r.x));
  const minY = Math.min(...plan.rooms.map((r) => r.y));
  const maxX = Math.max(...plan.rooms.map((r) => r.x + r.w));
  const maxY = Math.max(...plan.rooms.map((r) => r.y + r.h));
  return { minX, minY, maxX, maxY };
}

export function buildExportSvg(plan: Plan, showGrid: boolean): string {
  const source = document.getElementById("plan-svg") as SVGSVGElement | null;
  const bounds = planBounds(plan);
  const pad = 4.5;
  const titleH = 5;
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad - 1;
  const width = bounds.maxX - bounds.minX + pad * 2;
  const height = bounds.maxY - bounds.minY + pad * 2 + titleH + 1;
  const pxPerFt = 26;

  let inner = "";
  if (source) {
    const clone = source.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-export="skip"], .no-export').forEach((n) => n.remove());
    inner = clone.innerHTML;
  }

  const grid = showGrid
    ? `<defs>
        <pattern id="exp-minor" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#e7ebeb" stroke-width="0.035"/>
        </pattern>
        <pattern id="exp-major" width="5" height="5" patternUnits="userSpaceOnUse">
          <rect width="5" height="5" fill="url(#exp-minor)"/>
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#d6dede" stroke-width="0.06"/>
        </pattern>
      </defs>
      <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#exp-major)"/>`
    : "";

  const walls = computeWalls(plan);
  const wallLength = Math.round(walls.reduce((s, w) => s + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0));
  const area = Math.round(plan.rooms.reduce((s, r) => s + r.w * r.h, 0));
  const titleY = bounds.maxY + pad + 0.4;
  const titleX = bounds.maxX - 15;
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const titleBlock = `
    <g font-family="'IBM Plex Mono', monospace">
      <rect x="${titleX}" y="${titleY}" width="15" height="${titleH - 0.8}" fill="#faf8f2" stroke="#16313b" stroke-width="0.07"/>
      <line x1="${titleX}" y1="${titleY + 1.5}" x2="${titleX + 15}" y2="${titleY + 1.5}" stroke="#c8cec9" stroke-width="0.05"/>
      <line x1="${titleX + 9.5}" y1="${titleY + 1.5}" x2="${titleX + 9.5}" y2="${titleY + titleH - 0.8}" stroke="#c8cec9" stroke-width="0.05"/>
      <text x="${titleX + 0.5}" y="${titleY + 0.95}" font-size="1.15" fill="#16313b" font-family="Georgia, serif">${esc(plan.name)}</text>
      <text x="${titleX + 0.5}" y="${titleY + 2.25}" font-size="0.48" fill="#7c8b8e" letter-spacing="0.12">FLOOR PLAN · LEVEL 01</text>
      <text x="${titleX + 0.5}" y="${titleY + 3.1}" font-size="0.44" fill="#7c8b8e" letter-spacing="0.1">${plan.width}' × ${plan.depth}' · ${area} SQ FT · ${wallLength} LF WALLS</text>
      <text x="${titleX + 10}" y="${titleY + 2.25}" font-size="0.46" fill="#7c8b8e" letter-spacing="0.1">SCALE 1:50</text>
      <text x="${titleX + 10}" y="${titleY + 3.1}" font-size="0.46" fill="#7c8b8e" letter-spacing="0.1">${esc(date)}</text>
      <text x="${titleX + 0.5}" y="${titleY + 3.85}" font-size="0.42" fill="#b0ae9f" letter-spacing="0.16">STAYNTH STUDIO · SHEET A-101</text>
    </g>`;

  const northArrow = `
    <g transform="translate(${minX + 1.4} ${minY + 1.6})" font-family="'IBM Plex Mono', monospace">
      <circle cx="0" cy="0" r="0.85" fill="none" stroke="#b9c2c0" stroke-width="0.05"/>
      <path d="M 0 -0.65 L 0.28 0.3 L 0 0.12 L -0.28 0.3 Z" fill="#16313b"/>
      <text x="0" y="-1.15" font-size="0.42" text-anchor="middle" fill="#7c8b8e" letter-spacing="0.1">N</text>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${Math.round(width * pxPerFt)}" height="${Math.round(height * pxPerFt)}">
    <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#faf8f2"/>
    ${grid}
    <rect x="${minX + 0.6}" y="${minY + 0.6}" width="${width - 1.2}" height="${height - 1.2}" fill="none" stroke="#d9d4c6" stroke-width="0.05"/>
    ${inner}
    ${northArrow}
    ${titleBlock}
  </svg>`;
}

export function exportSvg(plan: Plan, showGrid: boolean) {
  const svg = buildExportSvg(plan, showGrid);
  const name = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "floor-plan";
  download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
}

export async function exportPng(plan: Plan, showGrid: boolean) {
  const svg = buildExportSvg(plan, showGrid);
  const name = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "floor-plan";
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render plan image"));
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale) || 2000;
    canvas.height = Math.round(img.height * scale) || 1400;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#faf8f2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, img.width, img.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (png) download(png, `${name}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Saves the full plan (all floors) so it can be re-uploaded into a property listing. */
export function exportPlanFile(plan: Plan) {
  const name = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "floor-plan";
  const payload = { app: "staynth", version: 1, exportedAt: new Date().toISOString(), plan };
  download(new Blob([JSON.stringify(payload)], { type: "application/json" }), `${name}.staynth.json`);
}
