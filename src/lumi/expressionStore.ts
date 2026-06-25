/**
 * Lumi expression manager.
 *
 * Tiny framework-agnostic store that holds the current expression name and
 * notifies subscribers when it changes. Any module (Emotion Recognition,
 * Speech State, LLM Response handler, ...) can call `setExpression()` to
 * update the face — the `<LumiExpressionView />` component re-renders
 * automatically and swaps in the matching SVG from `public/lumi/`.
 */

export const LUMI_EXPRESSIONS = [
  "neutral",
  "listening",
  "thinking",
  "speaking",
  "happy",
  "sad",
  "sleepy",
  "surprised",
] as const;

export type LumiExpressionName = (typeof LUMI_EXPRESSIONS)[number];

type Listener = (name: LumiExpressionName) => void;

let current: LumiExpressionName = "neutral";
const listeners = new Set<Listener>();

export function getExpression(): LumiExpressionName {
  return current;
}

export function setExpression(name: LumiExpressionName): void {
  if (!LUMI_EXPRESSIONS.includes(name)) {
    console.warn(`[lumi] unknown expression "${name}"`);
    return;
  }
  if (name === current) return;
  current = name;
  listeners.forEach((l) => l(name));
}

export function subscribeExpression(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Public URL for the SVG asset corresponding to an expression. */
export function expressionSrc(name: LumiExpressionName): string {
  return `/lumi/${name}.svg`;
}