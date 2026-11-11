import type { FurnitureType } from "@/types";

function accentForStairs(inside: boolean) {
  return inside ? "#8a6f51" : "#d4653f";
}

export function FurnitureSymbol({
  type,
  w,
  h,
  rot = 0,
  x = 0,
  y = 0,
  mode = "plan",
}: {
  type: FurnitureType;
  w: number;
  h: number;
  rot?: number;
  x?: number;
  y?: number;
  mode?: "plan" | "inside";
}) {
  const inside = mode === "inside";
  const fillMap: Record<string, string> = {
    bed: "#e8ddc9",
    nightstand: "#d9c8a9",
    wardrobe: "#cbb798",
    sofa: "#b6c4a9",
    "coffee-table": "#c9a982",
    rug: "#e0c5ae",
    tv: "#565a58",
    plant: "#8aa47f",
    "dining-table": "#c9a982",
    chair: "#cbb798",
    counter: "#ddd5c4",
    sink: "#f2f1ea",
    stove: "#5f6462",
    fridge: "#e9e9e2",
    toilet: "#f6f5ef",
    bathtub: "#f3f5f2",
    vanity: "#d3c1a3",
    shower: "#e5efee",
    desk: "#cdb28b",
    bookshelf: "#c2ab88",
    "balcony-chair": "#bfae90",
    washer: "#e7e7e1",
  };
  const stroke = inside ? "#5e594d" : "#849296";
  const fill = inside ? fillMap[type] ?? "#e7e0d3" : "#ffffff";
  const soft = inside ? "#f3ede2" : "#f7f7f3";
  const detail = inside ? "#8a8172" : "#a2adaf";
  const lw = inside ? 0.09 : 0.07;

  const common = {
    fill,
    stroke,
    strokeWidth: lw,
  };

  let body: React.ReactNode = null;

  switch (type) {
    case "bed":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.28} {...common} />
          <rect x={0} y={0} width={w} height={h * 0.09} fill={inside ? "#bfa98a" : soft} stroke={stroke} strokeWidth={lw} />
          <rect x={w * 0.09} y={h * 0.12} width={w * 0.38} height={h * 0.15} rx={0.2} fill={soft} stroke={detail} strokeWidth={lw * 0.8} />
          <rect x={w * 0.53} y={h * 0.12} width={w * 0.38} height={h * 0.15} rx={0.2} fill={soft} stroke={detail} strokeWidth={lw * 0.8} />
          <rect x={w * 0.04} y={h * 0.34} width={w * 0.92} height={h * 0.62} rx={0.22} fill={inside ? "#ded0b9" : soft} stroke={detail} strokeWidth={lw * 0.8} />
          <line x1={w * 0.08} y1={h * 0.52} x2={w * 0.92} y2={h * 0.52} stroke={detail} strokeWidth={lw * 0.7} />
        </>
      );
      break;
    case "nightstand":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.14} {...common} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.22} fill="none" stroke={detail} strokeWidth={lw} />
        </>
      );
      break;
    case "wardrobe":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.1} {...common} />
          <line x1={w / 2} y1={0.1} x2={w / 2} y2={h - 0.1} stroke={detail} strokeWidth={lw} />
          <circle cx={w / 2 - 0.22} cy={h / 2} r={0.07} fill={detail} />
          <circle cx={w / 2 + 0.22} cy={h / 2} r={0.07} fill={detail} />
          <line x1={0.2} y1={0.15} x2={0.2} y2={h - 0.15} stroke={detail} strokeWidth={lw * 0.6} />
          <line x1={w - 0.2} y1={0.15} x2={w - 0.2} y2={h - 0.15} stroke={detail} strokeWidth={lw * 0.6} />
        </>
      );
      break;
    case "sofa":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.38} {...common} />
          <rect x={0.16} y={0.16} width={w - 0.32} height={h * 0.3} rx={0.22} fill={soft} stroke={detail} strokeWidth={lw * 0.8} />
          <rect x={0.16} y={h * 0.44} width={w - 0.32} height={h * 0.46} rx={0.24} fill={inside ? "#c3cfb7" : soft} stroke={detail} strokeWidth={lw * 0.8} />
          <line x1={w / 2} y1={h * 0.46} x2={w / 2} y2={h * 0.88} stroke={detail} strokeWidth={lw * 0.7} />
          <rect x={0.1} y={0.15} width={0.3} height={h - 0.3} rx={0.12} fill={fill} stroke={detail} strokeWidth={lw * 0.7} />
          <rect x={w - 0.4} y={0.15} width={0.3} height={h - 0.3} rx={0.12} fill={fill} stroke={detail} strokeWidth={lw * 0.7} />
        </>
      );
      break;
    case "coffee-table":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.24} {...common} />
          <rect x={0.22} y={0.2} width={w - 0.44} height={h - 0.4} rx={0.16} fill="none" stroke={detail} strokeWidth={lw * 0.7} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.12} fill={soft} stroke={detail} strokeWidth={lw * 0.6} />
        </>
      );
      break;
    case "rug":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.18} fill={inside ? "#ddc0a8" : "#f4f1e9"} fillOpacity={inside ? 0.85 : 0.65} stroke={detail} strokeWidth={lw * 0.7} strokeDasharray="0.28 0.2" />
          <rect x={0.3} y={0.3} width={w - 0.6} height={h - 0.6} rx={0.1} fill="none" stroke={detail} strokeWidth={lw * 0.5} strokeDasharray="0.18 0.18" />
        </>
      );
      break;
    case "tv":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.1} fill={inside ? "#4d4f4c" : "#fbfbf8"} stroke={stroke} strokeWidth={lw} />
          <rect x={w * 0.22} y={h * 0.12} width={w * 0.56} height={h * 0.76} rx={0.05} fill={inside ? "#7d8a8a" : "#eef1ef"} stroke={detail} strokeWidth={lw * 0.6} />
        </>
      );
      break;
    case "plant": {
      const r = Math.min(w, h) / 2;
      body = (
        <>
          <circle cx={w / 2} cy={h / 2} r={r * 0.92} fill={inside ? "#7f9a76" : "#f4f6f0"} fillOpacity={0.95} stroke={stroke} strokeWidth={lw * 0.7} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx={w / 2 + Math.cos((a * Math.PI) / 180) * r * 0.45}
              cy={h / 2 + Math.sin((a * Math.PI) / 180) * r * 0.45}
              rx={r * 0.36}
              ry={r * 0.22}
              transform={`rotate(${a} ${w / 2} ${h / 2})`}
              fill={inside ? "#a6bb9c" : "#f7f8f3"}
              stroke={detail}
              strokeWidth={lw * 0.5}
            />
          ))}
          <circle cx={w / 2} cy={h / 2} r={r * 0.2} fill={inside ? "#c9a37c" : soft} stroke={detail} strokeWidth={lw * 0.5} />
        </>
      );
      break;
    }
    case "dining-table":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.4} {...common} />
          <rect x={0.2} y={0.2} width={w - 0.4} height={h - 0.4} rx={0.28} fill="none" stroke={detail} strokeWidth={lw * 0.7} />
          {inside && <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.16} fill="#e3d3b6" stroke={detail} strokeWidth={lw * 0.5} />}
        </>
      );
      break;
    case "chair":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.24} {...common} />
          <rect x={0.15} y={0.15} width={w - 0.3} height={h * 0.24} rx={0.14} fill={soft} stroke={detail} strokeWidth={lw * 0.7} />
        </>
      );
      break;
    case "counter":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.1} {...common} />
          <line x1={0.15} y1={h * 0.5} x2={w - 0.15} y2={h * 0.5} stroke={detail} strokeWidth={lw * 0.7} />
          <line x1={w - 0.5} y1={0.15} x2={w - 0.5} y2={h - 0.15} stroke={detail} strokeWidth={lw * 0.6} />
        </>
      );
      break;
    case "sink":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.12} fill={inside ? "#f4f4ee" : "#fbfbf8"} stroke={stroke} strokeWidth={lw} />
          <rect x={w * 0.16} y={h * 0.2} width={w * 0.68} height={h * 0.64} rx={0.2} fill={inside ? "#c9d6d3" : soft} stroke={detail} strokeWidth={lw * 0.7} />
          <circle cx={w / 2} cy={h * 0.5} r={Math.min(w, h) * 0.07} fill={detail} />
          <line x1={w / 2} y1={h * 0.16} x2={w / 2} y2={h * 0.3} stroke={detail} strokeWidth={lw} />
        </>
      );
      break;
    case "stove":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.1} fill={inside ? "#5a5f5d" : soft} stroke={stroke} strokeWidth={lw} />
          {[
            [0.3, 0.32],
            [0.7, 0.32],
            [0.3, 0.7],
            [0.7, 0.7],
          ].map(([px, py], i) => (
            <circle key={i} cx={w * px} cy={h * py} r={Math.min(w, h) * 0.13} fill="none" stroke={inside ? "#c8cec9" : detail} strokeWidth={lw * 0.8} />
          ))}
        </>
      );
      break;
    case "fridge":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.14} {...common} />
          <line x1={0.12} y1={h * 0.42} x2={w - 0.12} y2={h * 0.42} stroke={detail} strokeWidth={lw * 0.8} />
          <line x1={w * 0.24} y1={0.15} x2={w * 0.24} y2={h * 0.36} stroke={detail} strokeWidth={lw * 0.8} />
          <line x1={w * 0.24} y1={h * 0.48} x2={w * 0.24} y2={h - 0.15} stroke={detail} strokeWidth={lw * 0.8} />
        </>
      );
      break;
    case "toilet":
      body = (
        <>
          <rect x={w * 0.14} y={0} width={w * 0.72} height={h * 0.24} rx={0.12} fill={inside ? "#eeeee7" : soft} stroke={stroke} strokeWidth={lw} />
          <ellipse cx={w / 2} cy={h * 0.6} rx={w * 0.38} ry={h * 0.33} {...common} />
          <ellipse cx={w / 2} cy={h * 0.6} rx={w * 0.24} ry={h * 0.2} fill="none" stroke={detail} strokeWidth={lw * 0.7} />
        </>
      );
      break;
    case "bathtub":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.3} {...common} />
          <rect x={0.18} y={0.18} width={w - 0.36} height={h - 0.36} rx={0.26} fill={inside ? "#d7e4e2" : soft} stroke={detail} strokeWidth={lw * 0.7} />
          <circle cx={w - 0.55} cy={h / 2} r={0.1} fill={detail} />
        </>
      );
      break;
    case "vanity":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.12} {...common} />
          <ellipse cx={w / 2} cy={h / 2} rx={w * 0.3} ry={h * 0.3} fill={inside ? "#d9e6e3" : soft} stroke={detail} strokeWidth={lw * 0.7} />
          <circle cx={w / 2} cy={h / 2} r={0.07} fill={detail} />
        </>
      );
      break;
    case "shower":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.1} fill={inside ? "#dde9e7" : soft} stroke={stroke} strokeWidth={lw} />
          <path d={`M ${w * 0.18} ${h * 0.18} L ${w * 0.82} ${h * 0.82}`} stroke={detail} strokeWidth={lw * 0.6} />
          <path d={`M ${w * 0.18} ${h * 0.5} L ${w * 0.5} ${h * 0.18}`} stroke={detail} strokeWidth={lw * 0.6} />
          <circle cx={w * 0.8} cy={h * 0.2} r={0.12} fill="none" stroke={detail} strokeWidth={lw * 0.7} />
        </>
      );
      break;
    case "desk":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.14} {...common} />
          <rect x={w * 0.28} y={h * 0.22} width={w * 0.44} height={h * 0.5} rx={0.08} fill={soft} stroke={detail} strokeWidth={lw * 0.7} />
          <line x1={w * 0.2} y1={h * 0.18} x2={w * 0.2} y2={h * 0.82} stroke={detail} strokeWidth={lw * 0.6} />
        </>
      );
      break;
    case "bookshelf":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.08} {...common} />
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <line key={f} x1={0.12} y1={h * f} x2={w - 0.12} y2={h * f} stroke={detail} strokeWidth={lw * 0.7} />
          ))}
          <line x1={w * 0.5} y1={0.15} x2={w * 0.5} y2={h - 0.15} stroke={detail} strokeWidth={lw * 0.5} />
        </>
      );
      break;
    case "balcony-chair":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.32} {...common} />
          <rect x={0.16} y={0.16} width={w - 0.32} height={h * 0.3} rx={0.18} fill={soft} stroke={detail} strokeWidth={lw * 0.7} />
          <rect x={0.22} y={h * 0.5} width={w - 0.44} height={h * 0.34} rx={0.16} fill={inside ? "#cbd3bb" : soft} stroke={detail} strokeWidth={lw * 0.6} />
        </>
      );
      break;
    case "washer":
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.14} {...common} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.33} fill={inside ? "#d8e2df" : soft} stroke={detail} strokeWidth={lw * 0.8} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.2} fill="none" stroke={detail} strokeWidth={lw * 0.6} />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.06} fill={detail} />
        </>
      );
      break;
    case "stairs": {
      const steps = 7;
      body = (
        <>
          <rect x={0} y={0} width={w} height={h} rx={0.08} {...common} />
          {Array.from({ length: steps }, (_, index) => (
            <line key={index} x1={0.1} y1={(h / steps) * index} x2={w - 0.1} y2={(h / steps) * index} stroke={detail} strokeWidth={lw * 0.7} />
          ))}
          <path d={`M ${w / 2} ${h * 0.82} L ${w / 2} ${h * 0.18} M ${w * 0.38} ${h * 0.3} L ${w / 2} ${h * 0.18} L ${w * 0.62} ${h * 0.3}`} fill="none" stroke={accentForStairs(inside)} strokeWidth={lw * 1.2} />
        </>
      );
      break;
    }
    default:
      body = <rect x={0} y={0} width={w} height={h} rx={0.15} {...common} />;
  }

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`} style={{ pointerEvents: "none" }}>
      {body}
    </g>
  );
}
