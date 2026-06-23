import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  interimTranscript: string;
}

function generateUUID(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapshotExtras, setSnapshotExtras] = useState<{
    lastUserEmotion?: PipelineSnapshot["lastUserEmotion"];
    lastTranscript?: string;
    lastResponse?: string;
    error?: string;
  }>({});
  const [enrolledProfiles, setEnrolledProfiles] = useState<SpeakerProfile[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const interimTranscriptRef = useRef("");

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
        setMessages((prev) => [...prev, lumiMessage]);
        onMessage?.(lumiMessage);
        historyRef.current = [...historyRef.current, { role: "lumi", content: result.response }];
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

  // Keep ref up to date
  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  // Speech Recognition effect
  useEffect(() => {
    if (state !== "listening") {
      setInterimTranscript("");
      return;
    }

    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("SpeechRecognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "vi-VN";

    let silenceTimer: NodeJS.Timeout | null = null;
    let finalResultSent = false;
    let accumulatedText = "";

    const commitResult = (text: string) => {
      if (text.trim() && !finalResultSent) {
        finalResultSent = true;
        setInterimTranscript("");
        sendText(text);
        recognition.stop();
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      accumulatedText = final;
      setInterimTranscript(final + interim);

      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      if (final.trim() || interim.trim()) {
        silenceTimer = setTimeout(() => {
          commitResult(accumulatedText);
        }, 2000); // 2 seconds silence timeout
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setState("error");
        setSnapshotExtras((prev) => ({
          ...prev,
          error: "Quyền truy cập micro bị từ chối hoặc bị chặn.",
        }));
      } else if (event.error !== "no-speech") {
        setState("error");
        setSnapshotExtras((prev) => ({
          ...prev,
          error: `Lỗi nhận diện giọng nói: ${event.error}`,
        }));
      }
    };

    recognition.onend = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      if (!finalResultSent && accumulatedText.trim()) {
        commitResult(accumulatedText);
      }
      setInterimTranscript("");
    };

    recognition.start();

    return () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      recognition.abort();
    };
  }, [state, sendText]);

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
    interimTranscript,
  };
}
