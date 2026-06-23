/**
 * Lumi end-to-end voice pipeline.
 *
 * Coordinates: addressee detection → semantic VAD → ASR → speaker verification
 * → emotion recognition → empathetic LLM → TTS.
 *
 * Currently wired to mock stages — swap in real models behind the same interfaces.
 */

import type { PipelineState } from "@/types/pipeline";
import type { SpeakerProfile } from "@/types/speaker";
import type { EmotionReading } from "@/types/emotion";

import { mockAddresseeDetector } from "./wakeWordFree/addresseeDetection";
import { mockSemanticVAD } from "./turnTaking/semanticVAD";
import { mockVietnameseASR } from "./asr/vietnameseASR";
import { mockSpeakerVerifier } from "./speaker/speakerVerification";
import { mockEmotionRecognizer } from "./emotion/emotionRecognition";
import { mockEmpatheticLLM } from "./llm/empatheticResponse";
import { mockVietnameseTTS } from "./tts/vietnameseTTS";

export interface PipelineDependencies {
  addressee: typeof mockAddresseeDetector;
  vad: typeof mockSemanticVAD;
  asr: typeof mockVietnameseASR;
  speaker: typeof mockSpeakerVerifier;
  emotion: typeof mockEmotionRecognizer;
  llm: typeof mockEmpatheticLLM;
  tts: typeof mockVietnameseTTS;
}

export const defaultPipelineDeps: PipelineDependencies = {
  addressee: mockAddresseeDetector,
  vad: mockSemanticVAD,
  asr: mockVietnameseASR,
  speaker: mockSpeakerVerifier,
  emotion: mockEmotionRecognizer,
  llm: mockEmpatheticLLM,
  tts: mockVietnameseTTS,
};

export interface PipelineRunInput {
  audio?: Float32Array;
  /** Used when the user types instead of speaks. */
  textOverride?: string;
  enrolledProfiles?: SpeakerProfile[];
  history?: Array<{ role: "user" | "lumi"; content: string }>;
}

export interface PipelineRunOutput {
  transcript: string;
  emotion: EmotionReading;
  response: string;
  tone?: string;
}

export type PipelineProgress = (state: PipelineState) => void;

/**
 * Run a single user turn through the pipeline.
 *
 * The `onProgress` callback receives each state transition so the UI / face
 * can react in realtime.
 */
export async function runLumiTurn(
  input: PipelineRunInput,
  deps: PipelineDependencies = defaultPipelineDeps,
  onProgress: PipelineProgress = () => {},
): Promise<PipelineRunOutput> {
  const { audio, textOverride, enrolledProfiles = [], history = [] } = input;

  if (audio) {
    onProgress("detecting_addressee");
    const decision = await deps.addressee.detect({ audio, timestamp: Date.now() });
    if (!decision.isAddressingLumi) {
      onProgress("idle");
      throw new Error("Not addressing Lumi");
    }

    onProgress("checking_speaker");
    await deps.speaker.verify(audio, enrolledProfiles);
  }

  onProgress("transcribing");
  const transcript = textOverride
    ? textOverride
    : audio
      ? (await deps.asr.transcribe(audio)).text
      : "";

  onProgress("detecting_emotion");
  const readings: EmotionReading[] = [];
  if (audio) readings.push(await deps.emotion.fromSpeech(audio));
  if (transcript) readings.push(await deps.emotion.fromText(transcript));
  const fused = readings.length
    ? await deps.emotion.fuse(readings)
    : {
        emotion: "neutral" as const,
        confidence: 0.5,
        source: "text" as const,
        timestamp: Date.now(),
      };

  onProgress("thinking");
  const reply = await deps.llm.generate({
    userText: transcript,
    userEmotion: fused.emotion,
    history,
  });

  onProgress("speaking");
  await deps.tts.synthesize({ text: reply.text, tone: reply.tone });

  onProgress("idle");
  return {
    transcript,
    emotion: fused,
    response: reply.text,
    tone: reply.tone,
  };
}