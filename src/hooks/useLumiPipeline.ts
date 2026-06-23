import { useCallback, useMemo, useRef, useState } from "react";

import { runLumiTurn, defaultPipelineDeps } from "@/ai/pipeline";
import {
  expressionForState,
  type ChatMessage,
  type PipelineSnapshot,
  type PipelineState,
} from "@/types/pipeline";
import type { SpeakerProfile } from "@/types/speaker";

export interface UseLumiPipelineOptions {
  initialState?: PipelineState;
  onMessage?: (message: ChatMessage) => void;
}

export interface UseLumiPipelineResult {
  snapshot: PipelineSnapshot;
  messages: ChatMessage[];
  sendText: (text: string) => Promise<void>;
  setMuted: (muted: boolean) => void;
  setListening: (listening: boolean) => void;
  /** Replace in-memory history (e.g. when loading a saved conversation). */
  loadMessages: (messages: ChatMessage[]) => void;
  /** Clear local history (used when starting a new conversation). */
  resetMessages: () => void;
  /** Setters for enrolled speaker profiles — wired by future enrollment UI. */
  enrolledProfiles: SpeakerProfile[];
  setEnrolledProfiles: (profiles: SpeakerProfile[]) => void;
}

/**
 * High-level hook that owns the Lumi pipeline state machine.
 *
 * Real audio capture / streaming will be added here later; today it exposes
 * a sendText() entry point and progress-driven state transitions so the rest
 * of the UI can be built and tested.
 */
export function useLumiPipeline(
  options: UseLumiPipelineOptions = {},
): UseLumiPipelineResult {
  const { initialState = "idle", onMessage } = options;
  const [state, setState] = useState<PipelineState>(initialState);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapshotExtras, setSnapshotExtras] = useState<{
    lastUserEmotion?: PipelineSnapshot["lastUserEmotion"];
    lastTranscript?: string;
    lastResponse?: string;
    error?: string;
  }>({});
  const [enrolledProfiles, setEnrolledProfiles] = useState<SpeakerProfile[]>([]);

  const historyRef = useRef<Array<{ role: "user" | "lumi"; content: string }>>(
    [],
  );

  const setMuted = useCallback((muted: boolean) => {
    setState((prev) => (muted ? "muted" : prev === "muted" ? "idle" : prev));
  }, []);

  const setListening = useCallback((listening: boolean) => {
    setState((prev) => {
      if (listening) return "listening";
      if (prev === "listening") return "idle";
      return prev;
    });
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      onMessage?.(userMessage);
      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: trimmed },
      ];

      try {
        const result = await runLumiTurn(
          {
            textOverride: trimmed,
            enrolledProfiles,
            history: historyRef.current,
          },
          defaultPipelineDeps,
          (nextState) => setState(nextState),
        );

        const lumiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "lumi",
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, lumiMessage]);
        onMessage?.(lumiMessage);
        historyRef.current = [
          ...historyRef.current,
          { role: "lumi", content: result.response },
        ];
        setSnapshotExtras({
          lastUserEmotion: result.emotion.emotion,
          lastTranscript: result.transcript,
          lastResponse: result.response,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setState("error");
        setSnapshotExtras((prev) => ({ ...prev, error: message }));
      }
    },
    [enrolledProfiles, onMessage],
  );

  const loadMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    historyRef.current = next.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setSnapshotExtras({});
  }, []);

  const resetMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    setSnapshotExtras({});
  }, []);

  const snapshot = useMemo<PipelineSnapshot>(
    () => ({
      state,
      expression: expressionForState(state),
      ...snapshotExtras,
    }),
    [state, snapshotExtras],
  );

  return {
    snapshot,
    messages,
    sendText,
    setMuted,
    setListening,
    loadMessages,
    resetMessages,
    enrolledProfiles,
    setEnrolledProfiles,
  };
}