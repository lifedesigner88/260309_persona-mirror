import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Button, Input } from "@/common/components";

import { CapturePageShell } from "../components";
import { requestInterviewChat } from "../utils/api";
import { readCaptureDraft, saveDraft } from "../utils/storage";
import type { ChatMessage } from "../utils/types";
import { useCaptureRouteData } from "../utils/hooks";

export function InterviewCapturePage() {
  const { t } = useTranslation("capture");
  const { draft } = useCaptureRouteData();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(draft.interview.messages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-start: ask first question if no messages yet
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(null);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(userText: string | null) {
    const next: ChatMessage[] = userText
      ? [...messages, { role: "user", content: userText }]
      : messages;

    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const data = await requestInterviewChat(next);
      const updated: ChatMessage[] = [...next, { role: "assistant", content: data.message }];
      setMessages(updated);

      saveDraft({
        ...readCaptureDraft(),
        interview: { messages: updated, isComplete: data.is_complete },
      });

      if (data.is_complete) {
        setTimeout(() => navigate("/capture/review"), 1200);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: t("interview.errorMessage") }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  }

  return (
    <CapturePageShell
      badge={t("interview.badge")}
      description={t("interview.description")}
      footer={null}
      title={t("interview.title")}
    >
      <div className="flex flex-col gap-3 min-h-[320px] max-h-[480px] overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
              {t("interview.thinking")}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="mt-4 flex gap-2" onSubmit={handleSubmit}>
        <Input
          className="flex-1"
          disabled={loading || draft.interview.isComplete}
          placeholder={t("interview.placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button disabled={!input.trim() || loading || draft.interview.isComplete} type="submit">
          {t("interview.send")}
        </Button>
      </form>
    </CapturePageShell>
  );
}
