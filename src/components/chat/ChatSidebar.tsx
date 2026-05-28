import { Send, Mic, ChevronRight, MessageSquare } from "lucide-react";
import { useState, ReactNode } from "react";
import { Button } from "../ui/Button";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface ChatSidebarProps {
  title: string;
  messages: Message[];
  bottomAction?: ReactNode;
  configPanel?: ReactNode;
  disabled?: boolean;
}

export function ChatSidebar({ title, messages, bottomAction, configPanel, disabled }: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="w-14 border-l border-border bg-surface flex flex-col h-full items-center py-4 gap-4 transition-all duration-300">
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)} title="Expand Chat">
          <MessageSquare className="h-5 w-5 text-muted" />
        </Button>
        <div className="text-muted font-display text-sm tracking-widest mt-4" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          {title}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[340px] border-l border-border bg-surface flex flex-col h-full transition-all duration-300 shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <h2 className="font-display font-medium text-sm">{title}</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCollapsed(true)}>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg p-3 text-sm ${
                msg.role === "user"
                  ? "bg-border text-[color:var(--text-color)]"
                  : "bg-transparent border border-border text-muted"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {configPanel && (
        <div className="p-4 border-t border-border bg-base/50">
          {configPanel}
        </div>
      )}

      <div className="p-4 border-t border-border flex flex-col gap-3">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask Synthos..."
            disabled={disabled}
            className="w-full bg-base border border-border rounded-md pl-3 pr-20 py-2 text-sm focus:outline-none focus:border-muted text-[color:var(--text-color)] placeholder:text-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-1 flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted hover:text-[color:var(--text-color)]" disabled={disabled}>
              <Mic className="h-4 w-4" />
            </Button>
            <Button variant="primary" size="icon" className="h-7 w-7" disabled={disabled}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {bottomAction && (
          <div className="pt-2">
            {bottomAction}
          </div>
        )}
      </div>
    </div>
  );
}
