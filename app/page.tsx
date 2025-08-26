"use client";

import { useEffect, useRef, useState } from "react";
import TeX from "@matejmazur/react-katex";
import "katex/dist/katex.min.css";

type ChatMsg = { role: "user" | "bot"; content: string };

// Very small parser to render \( ... \) inline and \[ ... \] block LaTeX inside mixed text.
function renderWithLatex(text: string) {
  const parts: { type: "text" | "inline" | "block"; value: string }[] = [];
  const remaining = text;

  // First split out block math \[ ... \]
  const blockRegex = /\\\[((?:.|\n)*?)\\\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: remaining.slice(lastIndex, match.index) });
    }
    parts.push({ type: "block", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) {
    parts.push({ type: "text", value: remaining.slice(lastIndex) });
  }

  // For each text part, further split inline \( ... \)
  const final: { type: "text" | "inline" | "block"; value: string }[] = [];
  const inlineRegex = /\\\((.+?)\\\)/g;
  for (const p of parts) {
    if (p.type !== "text") {
      final.push(p);
      continue;
    }
    let idx = 0;
    let m: RegExpExecArray | null;
    while ((m = inlineRegex.exec(p.value)) !== null) {
      if (m.index > idx) {
        final.push({ type: "text", value: p.value.slice(idx, m.index) });
      }
      final.push({ type: "inline", value: m[1] });
      idx = m.index + m[0].length;
    }
    if (idx < p.value.length) {
      final.push({ type: "text", value: p.value.slice(idx) });
    }
  }

  return final.map((p, i) => {
    if (p.type === "text") return <span key={i}>{p.value}</span>;
    if (p.type === "inline") return <TeX key={i} math={p.value} />;
    return (
      <div key={i} className="my-2">
        <TeX block math={p.value} />
      </div>
    );
  });
}

export default function Home() {
  const [subject, setSubject] = useState<"math" | "chem" | "bio">("math");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isSending]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async () => {
    if (!question.trim() && !image) return;
    setIsSending(true);
    // 1) push user message to history
    setHistory((h) => [...h, { role: "user", content: question || "(이미지 분석)" }]);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, question, image }),
      });
      const data = await res.json();
      setHistory((h) => [...h, { role: "bot", content: data.answer || "응답이 없습니다." }]);
    } catch {
      setHistory((h) => [...h, { role: "bot", content: "오류가 발생했습니다." }]);
    } finally {
      setIsSending(false);
      setQuestion("");
      setImage(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl h-[calc(100vh-96px)] px-4">
      <div className="flex h-full flex-col">
        {/* Subject Tabs */}
        <div className="flex space-x-2">
          {([
            ["math", "수학"],
            ["chem", "화학"],
            ["bio", "생명"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSubject(key)}
              className={`px-4 py-2 rounded ${
                subject === key ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div id="chat-scroll" className="flex-1 overflow-y-auto py-3 space-y-2">
          {history.length === 0 && (
            <div className="text-gray-500 text-sm">질문을 입력하고 Enter를 눌러 시작하세요. (Shift+Enter 줄바꿈)</div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={`my-2 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded px-3 py-2 whitespace-pre-wrap shadow-sm ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}
              >
                {renderWithLatex(msg.content)}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="my-2 flex justify-start">
              <div className="max-w-[80%] rounded px-3 py-2 bg-gray-100 text-gray-500 shadow-sm">분석 중...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer (sticky bottom) */}
        <div className="sticky bottom-0">
          <div className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-t rounded-t-lg">
            <div className="p-3 space-y-2">
              <textarea
                className="w-full border border-gray-300 rounded p-2 resize-none"
                rows={3}
                placeholder={
                  subject === "math"
                    ? "예) \\(x^2-5x+6=0\\) 풀어줘"
                    : subject === "chem"
                    ? "예) 0.5M HCl 100 mL와 0.5M NaOH 80 mL 혼합 시 pH?"
                    : "예) A형 아버지(IAi), B형 어머니(IBi) 자녀 혈액형 확률?"
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <input type="file" accept="image/*" onChange={handleImageChange} />
                <button
                  onClick={sendMessage}
                  disabled={isSending}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  전송
                </button>
              </div>
              {image && (
                <div className="text-xs text-gray-600">
                  이미지 첨부됨 — 전송 시 함께 분석합니다.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
