import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState, type CSSProperties } from "react";
import { Menu } from "lucide-react";

import { LumiKawaiiFace } from "@/components/LumiKawaiiFace";
import { MessengerChat } from "@/components/MessengerChat";
import { ChatComposer } from "@/components/ChatComposer";
import { StatusIndicator } from "@/components/StatusIndicator";
import { EmotionIndicator } from "@/components/EmotionIndicator";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { useLumiPipeline } from "@/hooks/useLumiPipeline";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleFinal = useCallback(
    (text: string) => {
      void pipeline.sendText(text);
    },
    [pipeline],
  );
  const handleInterim = useCallback(
    (text: string) => {
      pipeline.setInterimTranscript(text);
    },
    [pipeline],
  );

  const stt = useSpeechRecognition({
    lang: "vi-VN",
    onFinal: handleFinal,
    onInterim: handleInterim,
  });

  const handleToggleMic = useCallback(async () => {
    if (stt.isListening) stt.stop();
    else await stt.start();
  }, [stt]);

  const statusLabel = recognitionStatusLabel(stt.status);

  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={
        {
          width: "100vw",
          height: "100dvh",
          "--lumi-input-bottom": "24px",
          "--lumi-input-h": "clamp(56px, 8vh, 72px)",
          "--lumi-status-bottom": "88px",
          "--lumi-chat-bottom": "140px",
        } as CSSProperties
      }
    >
      {/* Deep navy backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 0,
          background:
            "radial-gradient(ellipse at 30% 20%, oklch(0.55 0.2 320 / 0.85), transparent 60%), radial-gradient(ellipse at 75% 30%, oklch(0.55 0.2 350 / 0.7), transparent 55%), radial-gradient(ellipse at 50% 90%, oklch(0.5 0.22 260 / 0.7), transparent 60%), linear-gradient(180deg, oklch(0.18 0.1 290), oklch(0.1 0.06 270))",
        }}
        aria-hidden
      />

      {/* Lumi's face — large, centered, dominant character */}
      <div
        className="pointer-events-none absolute"
        style={{
          zIndex: 1,
        top: "6vh",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(95vw, 1700px)",
          height: "min(75vh, 900px)",
        }}
      >
        <LumiKawaiiFace expression="sad" />
      </div>

      {/* Top bar — hamburger only by default */}
      <header className="absolute inset-x-0 top-5 z-30 flex items-center justify-between px-5">
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

      {/* Messenger-style conversation, overlayed on top of the face */}
      <MessengerChat
        messages={pipeline.messages}
        interimTranscript={undefined}
        listening={stt.isListening}
      />

      {/* Floating status above the composer */}
      <div
        className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-1.5 px-4"
        style={{ bottom: "var(--lumi-status-bottom)" }}
      >
        <StatusIndicator state={pipeline.snapshot.state} />
        {statusLabel && (
          <span className="glass-pill px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground/75">
            {statusLabel}
          </span>
        )}
        {(stt.error || pipeline.snapshot.error) && (
          <p className="glass-pill mt-1 px-4 py-1.5 text-xs text-foreground/85">
            {stt.error ?? pipeline.snapshot.error}
          </p>
        )}
      </div>

      {/* Bottom composer — always visible */}
      <ChatComposer
        onSend={(t) => void pipeline.sendText(t)}
        micActive={stt.isListening}
        muted={!stt.isListening}
        onToggleMic={() => void handleToggleMic()}
        listening={stt.isListening}
        interimTranscript={pipeline.interimTranscript}
      />
    </main>
  );
}

function recognitionStatusLabel(
  status: ReturnType<typeof useSpeechRecognition>["status"],
): string | null {
  switch (status) {
    case "checking_permissions":
      return "Đang xin quyền micro…";
    case "starting":
      return "Đang khởi động…";
    case "listening":
      return "Đang nghe…";
    case "speech_detected":
      return "Đã nghe thấy bạn";
    case "processing":
      return "Đang xử lý…";
    case "no_speech":
      return "Chưa nghe rõ";
    case "denied":
      return "Micro bị chặn";
    case "unsupported":
      return "Trình duyệt chưa hỗ trợ";
    case "failed":
      return "Không kết nối được micro";
    default:
      return null;
  }
}
