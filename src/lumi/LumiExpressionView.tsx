import { expressionSrc, type LumiExpressionName } from "./expressionStore";
import { useExpression } from "./useExpression";

interface LumiExpressionViewProps {
  /** Override the store — useful for previews / docs. */
  expression?: LumiExpressionName;
  className?: string;
}

/**
 * Renders the current Lumi expression SVG from `public/lumi/`.
 * Updates automatically whenever `setExpression()` is called.
 */
export function LumiExpressionView({ expression, className }: LumiExpressionViewProps) {
  const current = useExpression();
  const name = expression ?? current;
  return (
    <img
      src={expressionSrc(name)}
      alt={`Lumi — ${name}`}
      className={className}
      draggable={false}
    />
  );
}