'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare,
  RotateCcw,
  Send,
  Share2,
  User,
  X,
} from 'lucide-react';
import { formatWhatsAppBrief, shareViaWhatsApp } from '@/lib/care-spaces';
import type {
  AqiResponse,
  CareSpaceProfile,
  ChatMessage,
  RecommendationPayload,
  UserProfile,
} from '@/types/air-quality';

interface ExpertChatBoxProps {
  profile: UserProfile;
  activeCareSpace: CareSpaceProfile;
  aqiData: AqiResponse | null;
  recommendations: RecommendationPayload | null;
}

export default function ExpertChatBox({
  profile,
  activeCareSpace,
  aqiData,
  recommendations,
}: ExpertChatBoxProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

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

  const handleWhatsAppShare = async () => {
    if (!aqiData) return;
    const message = formatWhatsAppBrief(
      activeCareSpace,
      aqiData,
      recommendations
    );
    const result = await shareViaWhatsApp(message);
    if (result === 'copied') {
      setShareToast('Morning air brief copied to clipboard');
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  const contextSubtitle = `${profile.location.city}${
    aqiData ? ` · ${aqiData.aqi} AQI` : ''
  }`;

  return (
    <>
      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#1C1B18] text-white text-xs font-medium shadow-md">
          {shareToast}
        </div>
      )}

      {/* Floating Popover Chat Window positioned cleanly above the stacked FABs */}
      {open && (
        <section
          role="dialog"
          aria-label="Ask the Air Expert"
          className="fixed bottom-36 right-6 z-40 w-[calc(100vw-3rem)] sm:w-[380px] max-h-[68vh] flex flex-col rounded-2xl bg-[#FFFFFF] border border-[#E7E5E0] shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#E7E5E0] flex items-center justify-between gap-2 bg-[#FFFFFF]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18] shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#1C1B18] truncate">
                  Ask the Air Expert
                </h2>
                <p className="text-[11px] text-[#6B6860] truncate">
                  {contextSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  aria-label="Clear chat"
                  title="Clear chat"
                  className="h-7 w-7 rounded-lg text-[#6B6860] hover:text-[#1C1B18] hover:bg-[#F4F2ED] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                title="Close (Esc)"
                className="h-7 w-7 rounded-lg text-[#6B6860] hover:text-[#1C1B18] hover:bg-[#F4F2ED] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F6]/50">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-[#6B6860] leading-relaxed">
                  Ask anything about your commute, opening windows, masks, or
                  family care in {profile.location.city}.
                </p>
                <div className="flex flex-col gap-2">
                  {starterQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={!aqiData || sending}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs font-medium px-3.5 py-2.5 rounded-xl bg-[#F4F2ED] hover:bg-[#E7E5E0] text-[#1C1B18] border border-[#E7E5E0] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <div className="h-6 w-6 rounded-lg bg-[#F4F2ED] border border-[#E7E5E0] flex items-center justify-center text-[#1C1B18] shrink-0 mt-0.5">
                        <MessageSquare className="h-3 w-3" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        m.role === 'user'
                          ? 'bg-[#F4F2ED] text-[#1C1B18] font-medium'
                          : 'bg-[#FFFFFF] text-[#1C1B18] border border-[#E7E5E0]'
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === 'user' && (
                      <div className="h-6 w-6 rounded-lg bg-[#1C1B18] flex items-center justify-center text-white shrink-0 mt-0.5">
                        <User className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-[#6B6860] pl-8">
                    <span className="h-2 w-2 rounded-full bg-[#1C1B18] animate-pulse" />
                    Putting together practical steps...
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Sticky Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="p-3 border-t border-[#E7E5E0] bg-[#FFFFFF] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                aqiData
                  ? 'Ask about commute, windows, masks...'
                  : 'Syncing local AQI...'
              }
              disabled={!aqiData || sending}
              className="flex-1 rounded-xl bg-[#FAF9F6] border border-[#E7E5E0] px-3.5 py-2 text-xs sm:text-sm text-[#1C1B18] placeholder:text-[#6B6860] focus:outline-none focus:border-[#1C1B18] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !aqiData || sending}
              aria-label="Send message"
              className="h-9 w-9 rounded-xl bg-[#1C1B18] hover:bg-[#1C1B18]/90 text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </section>
      )}

      {/* Stacked Circular Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
        {/* Top Circular FAB: Share on WhatsApp */}
        <button
          type="button"
          onClick={handleWhatsAppShare}
          disabled={!aqiData}
          aria-label="Share on WhatsApp"
          title="Share on WhatsApp"
          className="h-[52px] w-[52px] rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] shadow-md hover:scale-105 transition-transform flex items-center justify-center cursor-pointer disabled:opacity-50"
        >
          <Share2 className="h-5 w-5" />
        </button>

        {/* Bottom Circular FAB: AI Chatbot */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={
            open ? 'Close Air Expert chat' : 'Open Ask Air Expert chat'
          }
          title={open ? 'Close Air Expert' : 'Ask Air Expert'}
          aria-expanded={open}
          className="h-[52px] w-[52px] rounded-full bg-[#1C1B18] text-[#FAF9F6] border border-[#1C1B18] shadow-md hover:scale-105 transition-transform flex items-center justify-center cursor-pointer"
        >
          {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </button>
      </div>
    </>
  );
}
