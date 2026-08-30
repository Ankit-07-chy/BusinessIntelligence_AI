import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Bot, Send, X, Maximize2, Minimize2, MessageSquare, Loader2 } from "lucide-react";
import type { ChatResponse } from "../../lib/types";

interface MessageTurn {
  role: "user" | "assistant";
  text: string;
  isRestricted?: boolean;
}

export function InsightChatWidget({ anomalyId }: { anomalyId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [history, setHistory] = useState<MessageTurn[]>([
    {
      role: "assistant",
      text: "Hello! I am your Smart BI Assistant. Ask me anything about the KPI changes or operational drivers for this period. My answers are tailored specifically to your role.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [history, isOpen]);

  // Clear chat if the anomaly changes
  useEffect(() => {
    setHistory([
      {
        role: "assistant",
        text: "Hello! I am your Smart BI Assistant. Ask me anything about the KPI changes or operational drivers for this period. My answers are tailored specifically to your role.",
      },
    ]);
  }, [anomalyId]);

  const askMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await api.post<ChatResponse>("/chat", {
        anomalyId,
        message,
      });
      return response.data;
    },
    onMutate: (message) => {
      setHistory((prev) => [...prev, { role: "user", text: message }]);
      setInputValue("");
    },
    onSuccess: (data) => {
      const isRestricted = data.abstentionReasons?.some((r) => r.startsWith("blocked_domain:")) || data.abstained;
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response.summary,
          isRestricted,
        },
      ]);
    },
    onError: () => {
      setHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I encountered an issue retrieving the analysis. Please check your network connection or try rephrasing your query.",
        },
      ]);
    },
  });

  const handleSend = () => {
    if (!inputValue.trim() || askMutation.isPending) return;
    askMutation.mutate(inputValue.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label="Open Chatbot"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  const widthClass = isMaximized ? "w-[90vw] md:w-[600px]" : "w-80 md:w-96";
  const heightClass = isMaximized ? "h-[650px] max-h-[85vh]" : "h-[480px]";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${widthClass} ${heightClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Smart BI Assistant</h4>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Context: Selected Insight</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
            title={isMaximized ? "Minimize window size" : "Maximize window size"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
            title="Close chat"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/20">
        {history.map((turn, idx) => (
          <div
            key={idx}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"} items-start gap-2.5`}
          >
            {turn.role === "assistant" && (
              <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                <Bot size={14} />
              </div>
            )}
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm max-w-[82%] leading-relaxed ${
                turn.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none shadow-sm font-medium"
                  : turn.isRestricted
                  ? "bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 rounded-tl-none"
                  : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/80 rounded-tl-none shadow-sm"
              }`}
            >
              {turn.isRestricted && (
                <span className="font-bold text-xs uppercase tracking-wide block mb-1 text-amber-600 dark:text-amber-400">
                  Restricted by policy
                </span>
              )}
              {turn.text}
            </div>
          </div>
        ))}
        {askMutation.isPending && (
          <div className="flex justify-start items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
              <Bot size={14} />
            </div>
            <div className="rounded-2xl px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-tl-none shadow-sm flex items-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
              <Loader2 size={14} className="animate-spin" />
              Analyzing evidence pack…
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer input */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2">
        <textarea
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this KPI change…"
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || askMutation.isPending}
          className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
