'use client';

import React, { useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
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
    const primaryTravel = profile.travelModes?.[0] || 'daily commute';
    const sensitivities = (profile.healthSensitivities || []).filter(
      (s) => s !== 'None'
    );
    const sensitivityNote =
      sensitivities.length > 0
        ? `with ${sensitivities[0].toLowerCase()}`
        : 'for my household';

    if (profile.mode === 'school') {
      return [
        `What is the safest time for outdoor games in ${loc} today?`,
        `How do we protect ${profile.school?.studentGroup || 'students'} during morning drop-off?`,
        `What zero-cost classroom habits keep indoor air cleaner?`,
      ];
    }
    if (profile.mode === 'industry') {
      return [
        `How should outdoor crews in ${loc} time their breaks today?`,
        `What simple mask & water-rinse routine helps field staff most?`,
        `When is the best window to ventilate indoor bays or offices?`,
      ];
    }

    return [
      `How can I protect myself on ${primaryTravel} during rush hour in ${loc}?`,
      `Which hours should I open vs. keep windows shut ${sensitivityNote}?`,
      `What simple zero-cost steps help clear throat & nose irritation after traffic?`,
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
          content: 'Network error while contacting the air quality specialist.',
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
    <section className="rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E7E5E0] pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18]">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1B18]">
              Ask the Air Expert
            </h2>
            <p className="text-xs text-[#6B6860]">
              Practical, jargon-free answers grounded in your routine &amp; live AQI
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[#6B6860] bg-[#F4F2ED] border border-[#E7E5E0] px-2.5 py-1 rounded-full self-start sm:self-auto">
          Routine Synced
        </span>
      </div>

      {/* Starter Chips */}
      <div className="flex flex-wrap gap-2">
        {starterQuestions.map((q) => (
          <button
            key={q}
            type="button"
            disabled={!aqiData || sending}
            onClick={() => sendMessage(q)}
            className="text-left text-xs font-medium px-3.5 py-2 rounded-full bg-[#F4F2ED] hover:bg-[#E7E5E0] text-[#1C1B18] border border-[#E7E5E0] transition-colors cursor-pointer disabled:opacity-50"
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
              className={`flex items-start gap-2.5 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="h-7 w-7 rounded-lg bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18] shrink-0 mt-0.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[#F4F2ED] text-[#1C1B18] font-medium'
                    : 'bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0]'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="h-7 w-7 rounded-lg bg-[#1C1B18] flex items-center justify-center text-white shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-[#6B6860] pl-9">
              <span className="h-2 w-2 rounded-full bg-[#1C1B18] animate-pulse" />
              Checking your city&apos;s air &amp; putting together practical steps...
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
          placeholder="Ask about your commute, opening windows, kids' play, or masks..."
          disabled={!aqiData || sending}
          className="flex-1 rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-4 py-2.5 text-sm text-[#1C1B18] placeholder:text-[#6B6860] focus:outline-none focus:border-[#1C1B18] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || !aqiData || sending}
          aria-label="Send message"
          className="h-10 w-10 rounded-xl bg-[#1C1B18] hover:bg-[#1C1B18]/90 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
