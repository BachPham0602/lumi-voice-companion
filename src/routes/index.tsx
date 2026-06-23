import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { LumiFace } from "@/components/LumiFace";
import { VoiceOverlay } from "@/components/VoiceOverlay";
import { ChatOverlay } from "@/components/ChatOverlay";
import { StatusIndicator } from "@/components/StatusIndicator";
import { EmotionIndicator } from "@/components/EmotionIndicator";
import { useLumiPipeline } from "@/hooks/useLumiPipeline";
import { useVoiceState } from "@/hooks/useVoiceState";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumi – Ánh sáng đồng hành" },
      {
        name: "description",
        content:
          "Lumi là người bạn đồng hành bằng giọng nói, luôn ở đây với bạn — ấm áp, dịu dàng và lắng nghe.",
      },
      { property: "og:title", content: "Lumi – Ánh sáng đồng hành" },
      {
        property: "og:description",
        content:
          "Một người bạn AI đồng hành bằng giọng nói, dành cho những ai sống một mình.",
      },
    ],
  }),
  component: LumiHome,
});

function LumiHome() {
  const pipeline = useLumiPipeline();
  const voice = useVoiceState();
  const [chatOpen, setChatOpen] = useState(false);

  // Ask for microphone permission on first load
  useEffect(() => {
    if (voice.permission === "unknown" || voice.permission === "prompt") {
      void voice.requestMic();
    }
  }, [voice.permission, voice.requestMic]);

  // Reflect mic permission + mute into pipeline state
  useEffect(() => {
    if (voice.isMuted) {
      pipeline.setMuted(true);
      return;
    }
    pipeline.setMuted(false);
    if (voice.permission === "granted" && voice.isListening) {
      pipeline.setListening(true);
    }
    // pipeline functions are stable enough for this demo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isMuted, voice.permission, voice.isListening]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Soft ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, oklch(0.96 0.06 80 / 0.9), transparent 55%), radial-gradient(ellipse at 75% 80%, oklch(0.84 0.1 40 / 0.6), transparent 60%)",
        }}
        aria-hidden
      />

      {/* Top bar */}
      <header className="absolute inset-x-0 top-6 z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-[0.3em] text-foreground/60">
            LUMI
          </span>
        </div>
        <EmotionIndicator emotion={pipeline.snapshot.lastUserEmotion} />
      </header>

      {/* Lumi's face — the centerpiece */}
      <div className="absolute inset-0 flex items-center justify-center">
        <LumiFace expression={pipeline.snapshot.expression} />
      </div>

      {/* Floating message bubbles */}
      <ChatOverlay
        open={chatOpen}
        messages={pipeline.messages}
        onSend={(t) => void pipeline.sendText(t)}
        onClose={() => setChatOpen(false)}
      />

      {/* Status + controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-32 z-20 flex justify-center">
        <StatusIndicator state={pipeline.snapshot.state} />
      </div>

      <VoiceOverlay
        micActive={voice.isListening && voice.permission === "granted"}
        muted={voice.isMuted || voice.permission !== "granted"}
        onToggleMute={() => {
          if (voice.permission !== "granted") void voice.requestMic();
          else voice.toggleMute();
        }}
        onOpenChat={() => setChatOpen((v) => !v)}
        onOpenSettings={() => setChatOpen(false)}
      />

      {/* Mic-permission gentle hint */}
      {voice.permission === "denied" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-6">
          <p className="glass-pill px-4 py-1.5 text-xs text-foreground/70">
            Lumi cần quyền micro để có thể lắng nghe bạn. Bạn có thể gõ chữ nếu
            muốn.
          </p>
        </div>
      )}
    </main>
  );
}
