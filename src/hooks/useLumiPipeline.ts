import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { runLumiTurn, defaultPipelineDeps } from "@/ai/pipeline";
import {
  resolveExpression,
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
  interimTranscript: string;
  setInterimTranscript: (text: string) => void;
}

function generateUUID(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const INITIAL_GREETING = "Mình đang nghe đây. Bạn muốn kể mình nghe điều gì không?";

function makeGreeting(): ChatMessage {
  return {
    id: generateUUID(),
    role: "lumi",
    content: INITIAL_GREETING,
    timestamp: Date.now(),
  };
}

/**
 * High-level hook that owns the Lumi pipeline state machine.
 *
 * Real audio capture / streaming will be added here later; today it exposes
 * a sendText() entry point and progress-driven state transitions so the rest
 * of the UI can be built and tested.
 */
export function useLumiPipeline(options: UseLumiPipelineOptions = {}): UseLumiPipelineResult {
  const { initialState = "idle", onMessage } = options;
  const [state, setState] = useState<PipelineState>(initialState);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [makeGreeting()]);
  const [snapshotExtras, setSnapshotExtras] = useState<{
    lastUserEmotion?: PipelineSnapshot["lastUserEmotion"];
    lastTranscript?: string;
    lastResponse?: string;
    error?: string;
  }>({});
  const [enrolledProfiles, setEnrolledProfiles] = useState<SpeakerProfile[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");

  const historyRef = useRef<Array<{ role: "user" | "lumi"; content: string }>>([]);

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
        id: generateUUID(),
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      onMessage?.(userMessage);
      historyRef.current = [...historyRef.current, { role: "user", content: trimmed }];

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
          id: generateUUID(),
          role: "lumi",
          content: result.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "lumi" && last.content === result.response) {
            return prev;
          }
          return [...prev, lumiMessage];
        });
        const last = historyRef.current[historyRef.current.length - 1];
        if (!(last && last.role === "lumi" && last.content === result.response)) {
          onMessage?.(lumiMessage);
          historyRef.current = [...historyRef.current, { role: "lumi", content: result.response }];
        }
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

  // Speech recognition lives in useSpeechRecognition and is driven by the
  // mic button. The hook below just exposes setters for the interim text.

  const loadMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next.length > 0 ? next : [makeGreeting()]);
    historyRef.current = next.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setSnapshotExtras({});
  }, []);

  const resetMessages = useCallback(() => {
    setMessages([makeGreeting()]);
    historyRef.current = [];
    setSnapshotExtras({});
  }, []);

  const snapshot = useMemo<PipelineSnapshot>(
    () => ({
      state,
      expression: resolveExpression(state, snapshotExtras.lastUserEmotion),
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
    interimTranscript,
    setInterimTranscript,
  };
}
