'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import type { AqiResponse, ChatMessage, UserProfile } from '@/types/air-quality';

interface ExpertChatBoxProps {
  profile: UserProfile;
  aqiData: AqiResponse | null;
}

export default function ExpertChatBox({ profile, aqiData }: ExpertChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const starterQuestions = useMemo(() => {
    const loc = profile.location.town || profile.location.city || 'my area';
    if (profile.mode === 'school') {
      return [
        `Should we move morning assembly and sports indoors in ${loc} today?`,
        `How does today's PM2.5 affect ${profile.school?.studentGroup || 'students'}?`,
        `What low-cost classroom ventilation protocol works best during winter inversions?`,
      ];
    }
    if (profile.mode === 'industry') {
      return [
        `How should we schedule outdoor shifts in ${loc} under current AQI?`,
        `What PPE and break rotation do workers need at this PM2.5 level?`,
        `How can we cut diesel generator emissions during peak inversion hours?`,
      ];
    }
    const sensitivityNote =
      profile.personal?.sensitivity && profile.personal.sensitivity !== 'None'
        ? `with ${profile.personal.sensitivity} sensitivity`
        : 'for my household';
    return [
      `When is the safest 2-hour window to step out in ${loc} today?`,
      `What indoor air steps matter most ${sensitivityNote} on a ${profile.budget} budget?`,
      `Why do winter smog levels spike after sunset even when traffic drops?`,
    ];
  }, [profile]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !aqiData) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages,
          profile,
          aqiData,
        }),
      });
      const data = await res.json();
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            data.reply ||
            'Unable to reach the specialist right now. Please try again.',
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: 'Network error while contacting the meteorological specialist.',
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  };

  return (
    <section className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Weather & Respiratory Health Specialist
            </h2>
            <p className="text-xs text-slate-400">
              Powered by gemini-3.8-flash · Automatically grounded in your profile & live AQI
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-full self-start sm:self-auto">
          <Sparkles className="h-3 w-3" />
          Context Synced
        </span>
      </div>

      {/* 3 Clickable Starter Questions */}
      <div className="flex flex-wrap gap-2">
        {starterQuestions.map((q) => (
          <button
            key={q}
            type="button"
            disabled={!aqiData || sending}
            onClick={() => sendMessage(q)}
            className="text-left text-xs font-medium px-3.5 py-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-sky-200 border border-slate-700 hover:border-sky-500/50 transition cursor-pointer disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Conversation Feed */}
      {messages.length > 0 && (
        <div className="max-h-96 overflow-y-auto space-y-3 pr-1 pt-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-sky-500 text-white font-medium'
                    : 'bg-slate-800/85 text-slate-200 border border-slate-700/80'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="h-8 w-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-400 pl-11">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              Analyzing boundary-layer meteorology & health impact...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="flex items-center gap-2 pt-1"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about thermal inversions, N95 fit, indoor air, or safe hours..."
          disabled={!aqiData || sending}
          className="flex-1 rounded-2xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || !aqiData || sending}
          aria-label="Send message"
          className="h-11 w-11 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
