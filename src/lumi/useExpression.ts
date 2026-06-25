import { useSyncExternalStore } from "react";
import {
  getExpression,
  subscribeExpression,
  type LumiExpressionName,
} from "./expressionStore";

/** React hook that returns the current expression and re-renders on change. */
export function useExpression(): LumiExpressionName {
  return useSyncExternalStore(subscribeExpression, getExpression, getExpression);
}