import { useEffect, useState } from "react";
import type { LumiExpression } from "@/types/emotion";

/**
 * Kawaii anime-style Lumi face. Inline SVG so we can animate parts (blink,
 * bounce, gentle sway) and swap eye / mouth / brow shapes per expression
 * without re-fetching assets.
 *
 * 9 supported kawaii moods: happy, excited, playful, neutral, sad, worried,
 * sleepy, surprised, wink. Other LumiExpression values are mapped to the
 * closest kawaii mood.
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

/** Expressions whose eyes are drawn as ovals (and so can blink). */
const BLINKABLE: Record<Kawaii, boolean> = {
  neutral: true,
  sad: true,
  surprised: true,
  excited: true,
  wink: true, // only the open eye blinks
  playful: true, // only the open eye blinks
  happy: false,
  worried: false,
  sleepy: false,
};

interface Props {
  expression: LumiExpression;
}

export function LumiKawaiiFace({ expression }: Props) {
  const mood = toKawaii(expression);
  const [blink, setBlink] = useState(false);

  // Random natural blink loop
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
      {/* Soft glow behind eyes */}
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
          viewBox="0 0 300 220"
          preserveAspectRatio="xMidYMid meet"
          className="block h-full w-full drop-shadow-[0_20px_60px_rgba(180,120,255,0.4)]"
          role="img"
          aria-label={`Lumi — ${mood}`}
        >
          <defs>
            <radialGradient id="lumi-shine" cx="35%" cy="25%" r="80%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cfe2ff" />
            </radialGradient>
            <linearGradient id="lumi-eye" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#0b1330" />
              <stop offset="60%" stopColor="#1b2a6b" />
              <stop offset="100%" stopColor="#3457d6" />
            </linearGradient>
            <filter id="lumi-soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>

          {/* Blush */}
          <g style={{ opacity: mood === "sleepy" || mood === "sad" ? 0.55 : 0.85 }}>
            <ellipse cx="55" cy="135" rx="38" ry="14" fill="#f4a3b5" opacity="0.75" />
            <ellipse cx="245" cy="135" rx="38" ry="14" fill="#f4a3b5" opacity="0.75" />
          </g>

          {/* Eyebrows */}
          <Brows mood={mood} />

          {/* Eyes */}
          <Eyes mood={mood} blink={blink} />

          {/* Mouth */}
          <Mouth mood={mood} />
        </svg>
      </div>
    </div>
  );
}

/* ===== Eyes ===== */

function Eyes({ mood, blink }: { mood: Kawaii; blink: boolean }) {
  const canBlink = BLINKABLE[mood] && blink;

  // Closed-arc eyes (happy/playful-style — both closed)
  if (mood === "happy") {
    return (
      <g stroke="#020617" strokeWidth={11} strokeLinecap="round" fill="none">
        <path d="M55 90 Q95 45 135 90" />
        <path d="M165 90 Q205 45 245 90" />
      </g>
    );
  }
  if (mood === "sleepy") {
    return (
      <g stroke="#020617" strokeWidth={11} strokeLinecap="round" fill="none">
        <path d="M55 88 Q85 108 115 88" />
        <path d="M185 88 Q215 108 245 88" />
      </g>
    );
  }
  if (mood === "worried") {
    // Crossed/slanted lashes like the source "worried" expression
    return (
      <g>
        <path d="M55 55 L115 90 Q75 100 55 55" fill="#020617" />
        <path d="M245 55 L185 90 Q225 100 245 55" fill="#020617" />
        <circle cx="88" cy="75" r="7" fill="#ffffff" />
        <circle cx="212" cy="75" r="7" fill="#ffffff" />
      </g>
    );
  }

  if (mood === "wink") {
    return (
      <g>
        <OpenEye cx={85} cy={80} rx={30} ry={42} closed={canBlink} />
        <path
          d="M185 85 Q215 60 245 85"
          stroke="#020617"
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  }
  if (mood === "playful") {
    // left closed arc, right open eye
    return (
      <g>
        <path
          d="M55 85 Q85 50 115 85"
          stroke="#020617"
          strokeWidth={11}
          strokeLinecap="round"
          fill="none"
        />
        <OpenEye cx={215} cy={85} rx={30} ry={42} closed={canBlink} />
      </g>
    );
  }

  // Open-eye moods: neutral, excited, sad, surprised
  const eyeSize =
    mood === "surprised"
      ? { rx: 32, ry: 46 }
      : mood === "excited"
        ? { rx: 31, ry: 45 }
        : { rx: 30, ry: 42 };
  const sadShift = mood === "sad" ? 6 : 0;
  return (
    <g>
      <OpenEye cx={85} cy={80 + sadShift} rx={eyeSize.rx} ry={eyeSize.ry} closed={canBlink} />
      <OpenEye cx={215} cy={80 + sadShift} rx={eyeSize.rx} ry={eyeSize.ry} closed={canBlink} />
    </g>
  );
}

function OpenEye({
  cx,
  cy,
  rx,
  ry,
  closed,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  closed: boolean;
}) {
  if (closed) {
    return (
      <path
        d={`M ${cx - rx} ${cy} Q ${cx} ${cy + 10} ${cx + rx} ${cy}`}
        stroke="#020617"
        strokeWidth={9}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#lumi-eye)" />
      {/* big upper shine */}
      <ellipse
        cx={cx - rx * 0.32}
        cy={cy - ry * 0.38}
        rx={rx * 0.34}
        ry={ry * 0.32}
        fill="url(#lumi-shine)"
      />
      {/* lower sparkle */}
      <circle cx={cx + rx * 0.32} cy={cy + ry * 0.35} r={rx * 0.18} fill="#ffffff" />
      {/* tiny secondary glint */}
      <circle cx={cx + rx * 0.05} cy={cy - ry * 0.05} r={rx * 0.08} fill="#ffffff" opacity={0.8} />
    </g>
  );
}

/* ===== Eyebrows ===== */

function Brows({ mood }: { mood: Kawaii }) {
  const stroke = "#3a2a4a";
  const sw = 6;
  const common = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    fill: "none",
    filter: "url(#lumi-soft)",
    style: { transition: "d 0.35s ease" as const },
  };
  switch (mood) {
    case "sad":
    case "worried":
      return (
        <g {...common}>
          <path d="M50 38 Q85 22 120 42" />
          <path d="M180 42 Q215 22 250 38" />
        </g>
      );
    case "surprised":
    case "excited":
      return (
        <g {...common}>
          <path d="M55 32 Q85 22 120 32" />
          <path d="M180 32 Q215 22 245 32" />
        </g>
      );
    case "sleepy":
      return (
        <g {...common}>
          <path d="M55 48 Q85 46 120 50" />
          <path d="M180 50 Q215 46 245 48" />
        </g>
      );
    default:
      return (
        <g {...common}>
          <path d="M55 42 Q85 32 120 42" />
          <path d="M180 42 Q215 32 245 42" />
        </g>
      );
  }
}

/* ===== Mouth ===== */

function Mouth({ mood }: { mood: Kawaii }) {
  const stroke = "#020617";
  switch (mood) {
    case "happy":
    case "excited":
      return (
        <g>
          <path d="M120 120 Q150 185 180 120 Z" fill="#020617" />
          <path d="M138 155 Q150 175 162 155 Z" fill="#ff4d5a" />
        </g>
      );
    case "playful":
      return (
        <g>
          <path
            d="M115 117 Q150 180 185 117"
            fill="none"
            stroke={stroke}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <path d="M136 147 Q150 190 164 147 Z" fill="#ff4d5a" />
        </g>
      );
    case "wink":
      return (
        <g>
          <path d="M125 123 Q150 177 175 123 Z" fill="#020617" />
          <path d="M138 155 Q150 173 162 155 Z" fill="#ff4d5a" />
        </g>
      );
    case "sad":
      return (
        <path
          d="M110 175 Q150 130 190 175"
          fill="none"
          stroke={stroke}
          strokeWidth={12}
          strokeLinecap="round"
        />
      );
    case "worried":
      return (
        <path
          d="M115 150 Q130 135 145 150 T175 150"
          fill="none"
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
        />
      );
    case "sleepy":
      return (
        <path
          d="M120 155 Q150 170 180 155"
          fill="none"
          stroke={stroke}
          strokeWidth={10}
          strokeLinecap="round"
        />
      );
    case "surprised":
      return (
        <g>
          <ellipse cx={150} cy={150} rx={26} ry={36} fill="#020617" />
          <ellipse cx={150} cy={166} rx={17} ry={13} fill="#ff4d5a" />
        </g>
      );
    case "neutral":
    default:
      return (
        <path
          d="M115 145 Q150 172 185 145"
          fill="none"
          stroke={stroke}
          strokeWidth={11}
          strokeLinecap="round"
        />
      );
  }
}