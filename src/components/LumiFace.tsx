import { useEffect, useState } from "react";
import type { LumiExpression } from "@/types/emotion";

interface LumiFaceProps {
  expression: LumiExpression;
}

/**
 * Lumi's face. A soft glowing orb with eyes + mouth rendered in SVG.
 *
 * Animations: breathing (scale), blinking (eye lid), gentle eye drift,
 * and per-expression mouth + eye shape.
 *
 * Future work: richer expressions, micro-gestures, optional camera reaction.
 */
export function LumiFace({ expression }: LumiFaceProps) {
  const [blink, setBlink] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      setBlink(true);
      window.setTimeout(() => !cancelled && setBlink(false), 140);
      window.setTimeout(loop, 2800 + Math.random() * 2600);
    };
    const t = window.setTimeout(loop, 1800);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const drift = () => {
      if (cancelled) return;
      setGaze({
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 4,
      });
      window.setTimeout(drift, 2400 + Math.random() * 2200);
    };
    const t = window.setTimeout(drift, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const eyeShape = eyeShapeFor(expression, blink);
  const mouth = mouthPathFor(expression);
  const auraClass = auraClassFor(expression);

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer aura halos */}
      <div className={`absolute inset-0 -z-10 ${auraClass}`} aria-hidden />
      <div className="lumi-breathe relative">
        <svg
          viewBox="0 0 320 320"
          className="h-[68vmin] w-[68vmin] max-h-[640px] max-w-[640px] drop-shadow-[0_30px_80px_rgba(255,180,120,0.35)]"
          role="img"
          aria-label={`Lumi face — ${expression}`}
        >
          <defs>
            <radialGradient id="lumi-body" cx="50%" cy="42%" r="62%">
              <stop offset="0%" stopColor="oklch(0.97 0.05 70)" />
              <stop offset="55%" stopColor="oklch(0.86 0.10 55)" />
              <stop offset="100%" stopColor="oklch(0.62 0.13 32)" />
            </radialGradient>
            <radialGradient id="lumi-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.95 0.08 80 / 0.65)" />
              <stop offset="100%" stopColor="oklch(0.95 0.08 80 / 0)" />
            </radialGradient>
            <filter id="lumi-soft" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          <circle cx="160" cy="160" r="150" fill="url(#lumi-glow)" />
          <circle cx="160" cy="160" r="118" fill="url(#lumi-body)" />

          {/* highlight */}
          <ellipse
            cx="120"
            cy="110"
            rx="36"
            ry="20"
            fill="oklch(1 0 0 / 0.25)"
            filter="url(#lumi-soft)"
          />

          {/* eyes */}
          <g transform={`translate(${gaze.x}, ${gaze.y})`}>
            <Eye cx={128} cy={160} shape={eyeShape} />
            <Eye cx={192} cy={160} shape={eyeShape} />
          </g>

          {/* mouth */}
          <path
            d={mouth}
            stroke="oklch(0.28 0.06 30)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}

type EyeShape = "open" | "closed" | "soft" | "wide" | "squint" | "down";

function Eye({ cx, cy, shape }: { cx: number; cy: number; shape: EyeShape }) {
  if (shape === "closed") {
    return (
      <path
        d={`M ${cx - 12} ${cy} q 12 8 24 0`}
        stroke="oklch(0.25 0.05 30)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  if (shape === "squint") {
    return (
      <path
        d={`M ${cx - 14} ${cy + 2} q 14 -10 28 0`}
        stroke="oklch(0.25 0.05 30)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  const rx = shape === "wide" ? 9 : shape === "soft" ? 7 : 7;
  const ry =
    shape === "wide" ? 11 : shape === "soft" ? 8 : shape === "down" ? 9 : 9;
  const offsetY = shape === "down" ? 3 : 0;
  return (
    <g>
      <ellipse
        cx={cx}
        cy={cy + offsetY}
        rx={rx}
        ry={ry}
        fill="oklch(0.22 0.05 30)"
      />
      <circle cx={cx + 2} cy={cy - 2 + offsetY} r={2.2} fill="oklch(1 0 0)" />
    </g>
  );
}

function eyeShapeFor(expression: LumiExpression, blink: boolean): EyeShape {
  if (blink) return "closed";
  switch (expression) {
    case "sleepy":
      return "closed";
    case "happy":
    case "excited":
      return "squint";
    case "sad":
    case "concerned":
      return "down";
    case "thinking":
      return "soft";
    case "speaking":
    case "listening":
      return "wide";
    case "confused":
      return "soft";
    default:
      return "open";
  }
}

function mouthPathFor(expression: LumiExpression): string {
  // base center around (160, 215)
  switch (expression) {
    case "happy":
      return "M 132 210 q 28 28 56 0";
    case "excited":
      return "M 128 208 q 32 36 64 0";
    case "sad":
      return "M 132 222 q 28 -22 56 0";
    case "concerned":
      return "M 134 220 q 26 -10 52 0";
    case "speaking":
      return "M 138 214 q 22 16 44 0 q -22 -8 -44 0 Z";
    case "thinking":
      return "M 140 218 q 20 -4 40 -2";
    case "sleepy":
      return "M 140 218 q 20 6 40 0";
    case "confused":
      return "M 138 220 q 14 -8 28 4 q 8 -4 16 -6";
    case "listening":
      return "M 138 216 q 22 6 44 0";
    default:
      return "M 138 216 q 22 4 44 0";
  }
}

function auraClassFor(expression: LumiExpression): string {
  const base =
    "rounded-full blur-3xl opacity-80 transition-all duration-700 ease-out";
  switch (expression) {
    case "listening":
      return `${base} bg-[radial-gradient(circle,oklch(0.85_0.13_55_/_0.6),transparent_65%)] animate-pulse`;
    case "speaking":
      return `${base} bg-[radial-gradient(circle,oklch(0.84_0.16_45_/_0.7),transparent_65%)]`;
    case "thinking":
      return `${base} bg-[radial-gradient(circle,oklch(0.82_0.09_70_/_0.55),transparent_65%)]`;
    case "happy":
    case "excited":
      return `${base} bg-[radial-gradient(circle,oklch(0.9_0.14_80_/_0.7),transparent_65%)]`;
    case "sad":
    case "concerned":
      return `${base} bg-[radial-gradient(circle,oklch(0.7_0.08_260_/_0.5),transparent_65%)]`;
    case "sleepy":
      return `${base} bg-[radial-gradient(circle,oklch(0.7_0.05_280_/_0.45),transparent_65%)]`;
    case "confused":
      return `${base} bg-[radial-gradient(circle,oklch(0.78_0.1_30_/_0.55),transparent_65%)]`;
    default:
      return `${base} bg-[radial-gradient(circle,oklch(0.88_0.08_70_/_0.55),transparent_65%)]`;
  }
}