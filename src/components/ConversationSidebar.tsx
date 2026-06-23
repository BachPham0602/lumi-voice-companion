import { Plus, X, Settings, MessageCircle, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { groupByDay, type Conversation } from "@/store/conversations";

interface ConversationSidebarProps {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * ChatGPT-style left sidebar. Hidden by default, slides in from the left
 * when opened. Lists conversation history grouped by day.
 */
export function ConversationSidebar({
  open,
  conversations,
  activeId,
  onClose,
  onNew,
  onSelect,
  onDelete,
}: ConversationSidebarProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const groups = groupByDay(conversations);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-2 text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => {
              onNew();
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 px-4 py-3 text-sm font-medium text-sidebar-foreground transition hover:bg-sidebar-accent"
          >
            <Plus className="h-4 w-4" />
            <span>Đoạn hội thoại mới</span>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {groups.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-sidebar-foreground/60">
              Chưa có đoạn hội thoại nào. Hãy bắt đầu trò chuyện cùng Lumi.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/50">
                {group.label}
              </div>
              <ul className="space-y-1">
                {group.items.map((conv) => (
                  <li key={conv.id}>
                    <div
                      className={`group relative flex items-start gap-2 rounded-xl px-3 py-2 transition ${
                        conv.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(conv.id);
                          onClose();
                        }}
                        className="flex flex-1 items-start gap-3 text-left"
                      >
                        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm text-sidebar-foreground">
                            {conv.title}
                          </div>
                          {conv.messages.length > 0 && (
                            <div className="truncate text-xs text-sidebar-foreground/55">
                              {conv.messages[conv.messages.length - 1].content}
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(conv.id)}
                        aria-label="Xoá"
                        className="rounded-md p-1 text-sidebar-foreground/40 opacity-0 transition hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-sidebar-border px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent"
          >
            <Settings className="h-4 w-4" />
            Cài đặt
          </button>
        </div>
      </aside>
    </>
  );
}
