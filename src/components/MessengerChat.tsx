import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/pipeline";

interface MessengerChatProps {
  messages: ChatMessage[];
  interimTranscript?: string;
  listening?: boolean;
}

/**
 * Messenger-style conversation panel.
 *
 * Sits in a fixed region below Lumi's eyes — messages stream top to bottom,
 * Lumi on the left, user on the right. The panel is transparent so the face
 * stays visible behind it; bubbles use glassmorphism with low opacity.
 */
export function MessengerChat({ messages, interimTranscript, listening }: MessengerChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, interimTranscript]);

  const showInterim = listening && interimTranscript && interimTranscript.trim().length > 0;

  return (
    <div
      ref={scrollRef}
      className="pointer-events-auto absolute left-0 right-0 z-10 mx-auto flex w-full max-w-2xl flex-col gap-2 overflow-y-auto px-4 pb-4"
      style={{ bottom: "120px", maxHeight: "40vh" }}
    >
      {messages.map((m) => (
        <Bubble key={m.id} role={m.role} content={m.content} />
      ))}

      {showInterim && <Bubble role="user" content={interimTranscript!} interim />}
    </div>
  );
}

function Bubble({
  role,
  content,
  interim,
}: {
  role: "user" | "lumi";
  content: string;
  interim?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed shadow-[0_8px_28px_-16px_rgba(0,20,60,0.6)] backdrop-blur-xl ${
          isUser
            ? "bg-primary/55 text-primary-foreground rounded-br-md border border-primary/40"
            : "bg-white/10 text-foreground rounded-bl-md border border-white/15"
        } ${interim ? "opacity-70 italic" : "animate-fade-in"}`}
      >
        {content}
      </div>
    </div>
  );
}