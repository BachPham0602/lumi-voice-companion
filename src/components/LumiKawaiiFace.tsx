import { useEffect, useState } from "react";
import type { LumiExpression } from "@/types/emotion";

/**
 * Lumi face — inline SVG reproductions of the 9 reference kawaii expressions
 * (Happy, Excited, Playful, Neutral, Sad, Worried, Sleepy, Surprised, Wink).
 * Coordinates match the source 300x200 viewBox tile so each mood is faithful
 * to the supplied sheet. Smooth CSS transitions cross-fade between moods and
 * a random blink overlays the open-eyed expressions.
 */

type Kawaii =
  | "happy"
  | "excited"
  | "playful"
  | "neutral"
  | "sad"
  | "worried"
  | "sleepy"
  | "surprised"
  | "wink";

const KAWAII_LIST: Kawaii[] = [
  "happy",
  "excited",
  "playful",
  "neutral",
  "sad",
  "worried",
  "sleepy",
  "surprised",
  "wink",
];

function toKawaii(expr: LumiExpression): Kawaii {
  switch (expr) {
    case "happy":
      return "happy";
    case "excited":
      return "excited";
    case "playful":
      return "playful";
    case "sad":
      return "sad";
    case "concerned":
    case "worried":
    case "thinking":
      return "worried";
    case "sleepy":
      return "sleepy";
    case "surprised":
    case "confused":
      return "surprised";
    case "wink":
      return "wink";
    case "speaking":
      return "happy";
    case "listening":
    case "idle":
    default:
      return "neutral";
  }
}

interface Props {
  expression: LumiExpression;
}

export function LumiKawaiiFace({ expression }: Props) {
  const mood = toKawaii(expression);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      setBlink(true);
      window.setTimeout(() => !cancelled && setBlink(false), 130);
      window.setTimeout(loop, 2400 + Math.random() * 2800);
    };
    const t = window.setTimeout(loop, 1600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const wiggle =
    mood === "excited" || mood === "happy" || mood === "playful"
      ? "lumi-wiggle"
      : "lumi-breathe";

  return (
    <div className="absolute inset-0 h-full w-full">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 50% 38%, oklch(0.78 0.18 320 / 0.45), transparent 70%)",
        }}
      />
      <div className={`absolute inset-0 ${wiggle}`}>
        <svg
          viewBox="0 0 300 200"
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full drop-shadow-[0_20px_60px_rgba(180,120,255,0.4)]"
          role="img"
          aria-label={`Lumi — ${mood}`}
        >
          {/* Cross-fade between every expression — only the active mood has
              opacity 1; React still keeps the others mounted so the CSS
              opacity transition handles the morph smoothly. */}
          {KAWAII_LIST.map((m) => (
            <g
              key={m}
              style={{
                opacity: m === mood ? 1 : 0,
                transition: "opacity 0.35s ease",
              }}
            >
              <ExpressionLayer mood={m} blink={m === mood && blink} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ===== Per-expression layer — matches the reference SVG paths 1:1 ===== */

const EYE = "#020617";
const SHINE = "#ffffff";
const BLUSH = "#f4a3b5";
const TONGUE = "#ff4d5a";
const STROKE = 14;

function Mouth({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={EYE}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Blush({ dim = false }: { dim?: boolean }) {
  const opacity = dim ? 0.45 : 0.75;
  return (
    <g>
      <ellipse cx={55} cy={125} rx={38} ry={14} fill={BLUSH} opacity={opacity} />
      <ellipse cx={245} cy={125} rx={38} ry={14} fill={BLUSH} opacity={opacity} />
    </g>
  );
}

/** Open round eye with two shines, exactly like the reference. */
function OpenEye({
  cx,
  cy,
  rx = 30,
  ry = 42,
  blink,
}: {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  blink: boolean;
}) {
  if (blink) {
    return (
      <path
        d={`M ${cx - rx} ${cy} Q ${cx} ${cy + 8} ${cx + rx} ${cy}`}
        fill="none"
        stroke={EYE}
        strokeWidth={8}
        strokeLinecap="round"
      />
    );
  }
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={EYE} />
      <circle cx={cx - 10} cy={cy - 15} r={10} fill={SHINE} />
      <circle cx={cx + 10} cy={cy + 17} r={6} fill={SHINE} />
      <Lashes cx={cx} cy={cy} rx={rx} ry={ry} />
    </g>
  );
}

/** Anime-style upper lashes — full curved lid + elegant radiating strands. */
function Lashes({
  cx,
  cy,
  rx,
  ry,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}) {
  const top = cy - ry;
  return (
    <g fill="none" stroke={EYE} strokeLinecap="round">
      {/* thick upper lid line */}
      <path
        d={`M ${cx - rx - 2} ${top + 6} Q ${cx} ${top - 6} ${cx + rx + 2} ${top + 6}`}
        strokeWidth={7}
      />
      {/* full radiating lash strands — 7 elegant curves */}
      {/* outermost long flick */}
      <path d={`M ${cx + rx} ${top + 6} q 10 -14 16 -22`} strokeWidth={3} />
      {/* second outer */}
      <path d={`M ${cx + rx - 4} ${top + 3} q 7 -12 11 -18`} strokeWidth={2.5} />
      {/* mid-outer */}
      <path d={`M ${cx + rx - 10} ${top} q 5 -10 8 -15`} strokeWidth={2} />
      {/* center peak lash — tallest & most prominent */}
      <path d={`M ${cx} ${top - 3} q 0 -14 0 -20`} strokeWidth={3.5} />
      {/* mid-inner */}
      <path d={`M ${cx - rx + 10} ${top} q -5 -10 -8 -15`} strokeWidth={2} />
      {/* second inner */}
      <path d={`M ${cx - rx + 4} ${top + 3} q -7 -12 -11 -18`} strokeWidth={2.5} />
      {/* innermost flick */}
      <path d={`M ${cx - rx} ${top + 6} q -10 -14 -16 -22`} strokeWidth={3} />
      {/* tiny accent lash near center-right for fullness */}
      <path d={`M ${cx + rx - 18} ${top - 1} q 3 -8 5 -12`} strokeWidth={1.5} />
    </g>
  );
}

function ExpressionLayer({ mood, blink }: { mood: Kawaii; blink: boolean }) {
  switch (mood) {
    case "happy":
      return (
        <g>
          {/* arched closed eyes */}
          <Mouth d="M55 85 Q95 35 135 85" />
          <Mouth d="M165 85 Q205 35 245 85" />
          <Blush />
          {/* big smile + tongue */}
          <path d="M120 115 Q150 180 180 115 Z" fill={EYE} />
          <path d="M138 152 Q150 172 162 152 Z" fill={TONGUE} />
        </g>
      );
    case "excited":
      return (
        <g>
          <OpenEye cx={85} cy={85} rx={30} ry={45} blink={blink} />
          <OpenEye cx={215} cy={85} rx={30} ry={45} blink={blink} />
          <Blush />
          <path d="M125 120 Q150 175 175 120 Z" fill={EYE} />
          <path d="M138 150 Q150 168 162 150 Z" fill={TONGUE} />
        </g>
      );
    case "playful":
      return (
        <g>
          {/* left winked arch, right open eye */}
          <Mouth d="M55 80 Q85 45 115 80" />
          <OpenEye cx={215} cy={80} blink={blink} />
          <Blush />
          <path
            d="M115 112 Q150 175 185 112"
            fill="none"
            stroke={EYE}
            strokeWidth={14}
            strokeLinecap="round"
          />
          <path d="M136 142 Q150 185 164 142 Z" fill={TONGUE} />
        </g>
      );
    case "neutral":
      return (
        <g>
          <OpenEye cx={85} cy={75} blink={blink} />
          <OpenEye cx={215} cy={75} blink={blink} />
          <Blush />
          <Mouth d="M110 140 Q150 170 190 140" />
        </g>
      );
    case "sad":
      return (
        <g>
          <OpenEye cx={85} cy={75} blink={blink} />
          <OpenEye cx={215} cy={75} blink={blink} />
          <Blush dim />
          <Mouth d="M110 170 Q150 125 190 170" />
        </g>
      );
    case "worried":
      return (
        <g>
          {/* slanted lash shapes */}
          <path d="M55 50 L115 85 Q75 95 55 50" fill={EYE} />
          <path d="M245 50 L185 85 Q225 95 245 50" fill={EYE} />
          <circle cx={88} cy={70} r={8} fill={SHINE} />
          <circle cx={212} cy={70} r={8} fill={SHINE} />
          <Blush />
          <Mouth d="M115 145 Q130 130 145 145 T175 145" />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <Mouth d="M55 80 Q85 100 115 80" />
          <Mouth d="M185 80 Q215 100 245 80" />
          <Blush dim />
          <Mouth d="M120 150 Q150 165 180 150" />
        </g>
      );
    case "surprised":
      return (
        <g>
          <ellipse cx={85} cy={75} rx={32} ry={45} fill={EYE} />
          <ellipse cx={215} cy={75} rx={32} ry={45} fill={EYE} />
          <circle cx={75} cy={58} r={10} fill={SHINE} />
          <circle cx={205} cy={58} r={10} fill={SHINE} />
          <Lashes cx={85} cy={75} rx={32} ry={45} />
          <Lashes cx={215} cy={75} rx={32} ry={45} />
          <Blush />
          {/* O mouth */}
          <ellipse cx={150} cy={145} rx={28} ry={38} fill={EYE} />
          <ellipse cx={150} cy={162} rx={18} ry={14} fill={TONGUE} />
        </g>
      );
    case "wink":
      return (
        <g>
          <OpenEye cx={85} cy={75} blink={blink} />
          {/* right winked arch */}
          <Mouth d="M185 80 Q215 55 245 80" />
          <Blush />
          <path d="M125 118 Q150 172 175 118 Z" fill={EYE} />
          <path d="M138 150 Q150 168 162 150 Z" fill={TONGUE} />
        </g>
      );
  }
}