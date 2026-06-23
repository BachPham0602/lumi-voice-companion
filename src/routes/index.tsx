import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { LumiFace } from "@/components/LumiFace";
import { VoiceOverlay } from "@/components/VoiceOverlay";
import { ChatOverlay } from "@/components/ChatOverlay";
import { StatusIndicator } from "@/components/StatusIndicator";
import { EmotionIndicator } from "@/components/EmotionIndicator";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useLumiPipeline } from "@/hooks/useLumiPipeline";
import { useVoiceState } from "@/hooks/useVoiceState";
import { useConversations } from "@/store/conversations";

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
        content: "Một người bạn AI đồng hành bằng giọng nói, dành cho những ai sống một mình.",
      },
    ],
  }),
  component: LumiHome,
});

function LumiHome() {
  const conversations = useConversations();
  const pipeline = useLumiPipeline({
    onMessage: (m) => conversations.appendMessage(m),
  });
  const voice = useVoiceState();
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    if (voice.permission === "granted" && voice.isListening && pipeline.snapshot.state === "idle") {
      pipeline.setListening(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.isMuted, voice.permission, voice.isListening, pipeline.snapshot.state]);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Soft ambient backdrop */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, oklch(0.32 0.13 255 / 0.7), transparent 65%), radial-gradient(ellipse at 80% 90%, oklch(0.18 0.08 260 / 0.9), transparent 60%), linear-gradient(180deg, oklch(0.12 0.05 260), oklch(0.07 0.04 265))",
        }}
        aria-hidden
      />

      {/* Top bar — hamburger only by default */}
      <header className="absolute inset-x-0 top-5 z-20 flex items-center justify-between px-5">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Mở danh sách hội thoại"
          className="glass-button h-11 w-11"
        >
          <Menu className="h-5 w-5" />
        </button>
        <EmotionIndicator emotion={pipeline.snapshot.lastUserEmotion} />
      </header>

      <ConversationSidebar
        open={sidebarOpen}
        conversations={conversations.conversations}
        activeId={conversations.activeId}
        onClose={() => setSidebarOpen(false)}
        onNew={() => {
          conversations.startNewConversation();
          pipeline.resetMessages();
        }}
        onSelect={(id) => {
          const msgs = conversations.selectConversation(id);
          pipeline.loadMessages(msgs);
        }}
        onDelete={(id) => conversations.deleteConversation(id)}
      />

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
        interimTranscript={pipeline.interimTranscript}
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
            Lumi cần quyền micro để có thể lắng nghe bạn. Bạn có thể gõ chữ nếu muốn.
          </p>
        </div>
      )}
    </main>
  );
}
