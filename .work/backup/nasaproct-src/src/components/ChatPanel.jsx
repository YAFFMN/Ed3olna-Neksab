import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CornerDownLeft, Mic, MicOff, Send, Sparkles, User, Volume2, VolumeX } from 'lucide-react';
import { postChat } from '../services/api.js';
import { formatUtcTime } from '../utils/format.js';

const QUICK_PROMPTS = [
  'What is my current radiation dose and safe limit?',
  'Explain the Tri-Node wearable hardware system.',
  'How does sleep debt compound radiation risk?',
  'What countermeasures should I follow for an SPE?',
];

function FormattedContent({ text }) {
  const parts = String(text || '').split(/(\*\*.*?\*\*|\[(?:NASA|CSA|RCPT)[^\]]*\])/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    }
    if (/^\[(NASA|CSA|RCPT)/.test(part) && part.endsWith(']')) {
      const isNasa = part.startsWith('[NASA');
      const isRcpt = part.startsWith('[RCPT');
      const label = part.slice(1, -1);
      return (
        <span
          key={index}
          className={`mx-0.5 inline-block rounded border px-1.5 py-0.2 font-mono text-[8px] font-bold tracking-wider ${
            isRcpt
              ? 'border-[#35d08a]/40 bg-[#35d08a]/15 text-[#7be8a0]'
              : isNasa
              ? 'border-[#17a9f0]/40 bg-[#17a9f0]/15 text-[#5cc8ff]'
              : 'border-purple-400/40 bg-purple-500/15 text-purple-300'
          }`}
        >
          {label}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const cleaned = String(text || '')
    .replace(/\[(?:NASA|CSA|RCPT)[^\]]*\]/g, '')
    .replace(/\*\*/g, '')
    .trim();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function MessageBubble({ message, onSpeak }) {
  const isAstronaut = String(message.sender || '').toUpperCase() === 'ASTRONAUT';

  return (
    <div className={`flex items-start gap-2.5 ${isAstronaut ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
        isAstronaut
          ? 'border-[#17a9f0]/30 bg-[#17a9f0]/10 text-[#17a9f0]'
          : 'border-purple-400/30 bg-purple-500/10 text-purple-300'
      }`}>
        {isAstronaut ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div className={`flex max-w-[85%] flex-col ${isAstronaut ? 'items-end' : 'items-start'}`}>
        <div className="mb-1 flex items-center gap-1.5 font-mono text-[8px] tracking-wider text-[#8fa0b4]">
          <span>{isAstronaut ? 'COMMANDER' : 'NOVA AI'}</span>
          {message.optimistic && <span className="text-[#ffb224]">// SENDING</span>}
        </div>

        <div className={`rounded-xl p-3 text-xs leading-relaxed ${
          isAstronaut
            ? 'rounded-tr-none border border-[#17a9f0]/20 bg-[#17a9f0]/10 text-slate-100'
            : 'rounded-tl-none border border-[#1d2836] bg-[#060d17] text-slate-200'
        }`}>
          <FormattedContent text={message.message} />
        </div>

        <div className="mt-1 flex items-center gap-2">
          <time className="font-mono text-[8px] text-[#8fa0b4]">
            {message.sent_at ? formatUtcTime(message.sent_at) + ' UTC' : 'JUST NOW'}
          </time>
          {!isAstronaut && (
            <button
              type="button"
              onClick={() => onSpeak(message.message)}
              title="Speak message aloud (Voice Assistant)"
              className="text-[#8fa0b4] hover:text-[#17a9f0]"
            >
              <Volume2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ chatHistory = [], astronautId = 1, onRefresh, notify }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [optimisticList, setOptimisticList] = useState([]);
  const scrollerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const allMessages = useMemo(() => {
    const list = [...chatHistory, ...optimisticList];
    const map = new Map();
    list.forEach((m) => {
      const key = m.id ? `id-${m.id}` : `opt-${m.sender}-${m.message}-${m.sent_at}`;
      if (!map.has(key)) map.set(key, m);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.sent_at || Date.now()) - new Date(b.sent_at || Date.now())
    );
  }, [chatHistory, optimisticList]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [allMessages.length, sending]);

  async function handleSend(promptText = draft) {
    const message = promptText.trim();
    if (!message || sending) return;

    const optId = `pending-${Date.now()}`;
    const userMsg = {
      id: optId,
      sender: 'ASTRONAUT',
      message,
      sent_at: new Date().toISOString(),
      optimistic: true,
    };

    setOptimisticList((prev) => [...prev, userMsg]);
    setDraft('');
    setSending(true);

    try {
      const res = await postChat(message, astronautId);
      if (res?.reply) {
        setOptimisticList((prev) => [
          ...prev.filter((m) => m.id !== optId),
          res.reply,
        ]);
        if (autoVoice && res.reply.message) {
          speakText(res.reply.message);
        }
      }
      await onRefresh();
    } catch (err) {
      notify({
        type: 'error',
        title: 'NOVA CONNECTION ERROR',
        message: err?.message || 'Flight surgeon channel unavailable.',
      });
    } finally {
      setSending(false);
    }
  }

  function toggleVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      notify?.({
        type: 'error',
        title: 'VOICE INPUT UNAVAILABLE',
        message: 'This browser does not expose the Web Speech API. Type the question instead.',
      });
      return;
    }
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.lang = document.documentElement.lang || 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript.trim()) void handleSend(transcript);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch (error) {
      setListening(false);
      notify?.({
        type: 'error',
        title: 'MICROPHONE ERROR',
        message: error?.message || 'Could not start speech recognition.',
      });
    }
  }

  return (
    <div className="rcpt-panel flex h-full min-h-[580px] flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1d2836] p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10 text-purple-300">
            <Sparkles size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Nova Flight Surgeon</h2>
              <span className="badge-rcpt badge-live">RAG AI</span>
            </div>
            <p className="font-mono text-[8px] text-[#8fa0b4]">NASA HRP & CSA VERIFIED ASSISTANT</p>
          </div>
        </div>

        {/* Voice Toggle */}
        <button
          type="button"
          onClick={() => setAutoVoice(!autoVoice)}
          title={autoVoice ? 'Auto-voice response enabled' : 'Auto-voice response disabled'}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[8px] font-bold transition ${
            autoVoice
              ? 'border-[#17a9f0] bg-[#17a9f0]/20 text-[#5cc8ff]'
              : 'border-[#1d2836] bg-[#060d17] text-slate-400 hover:text-white'
          }`}
        >
          {autoVoice ? <Volume2 size={11} /> : <VolumeX size={11} />}
          {autoVoice ? 'VOICE ON' : 'VOICE OFF'}
        </button>
      </div>

      {/* Message Stream */}
      <div
        ref={scrollerRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        style={{ maxHeight: '400px' }}
      >
        {allMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#8fa0b4]">
            <Bot size={32} className="text-[#1d2836]" />
            <p className="mt-2 text-xs font-semibold text-slate-300">Nova is online & standing by.</p>
            <p className="mt-1 text-[10px] text-[#8fa0b4]">
              Ask questions about radiation exposure, countermeasures, or the Tri-Node biometrics.
            </p>
          </div>
        ) : (
          allMessages.map((msg, idx) => (
            <MessageBubble
              key={msg.id || idx}
              message={msg}
              onSpeak={speakText}
            />
          ))
        )}

        {sending && (
          <div className="flex items-center gap-2 font-mono text-[10px] text-[#8fa0b4]">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            Nova is analyzing NASA/CSA knowledge base...
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="border-t border-[#1d2836] bg-[#060d17]/50 p-2.5">
        <p className="mb-1.5 font-mono text-[8px] font-semibold text-[#8fa0b4]">SUGGESTED QUERIES</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => void handleSend(prompt)}
              className="rounded-full border border-[#1d2836] bg-[#0a0f16] px-2.5 py-1 text-left font-mono text-[9px] text-slate-300 transition hover:border-[#17a9f0]/50 hover:text-white disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="border-t border-[#1d2836] p-3"
      >
        <div className="flex items-center gap-2 rounded-xl border border-[#1d2836] bg-[#060d17] p-2 transition focus-within:border-[#17a9f0]">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={sending}
            placeholder="Ask Nova about your health, radiation, or wearables..."
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder-[#8fa0b4] outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={sending}
            title={listening ? 'Stop listening' : 'Ask by voice'}
            aria-label={listening ? 'Stop listening' : 'Ask by voice'}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:opacity-40 ${
              listening
                ? 'animate-pulse border-[#ff5d4d]/60 bg-[#ff5d4d]/20 text-[#ff8a7f]'
                : 'border-[#1d2836] bg-[#0a0f16] text-[#8fa0b4] hover:text-white'
            }`}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#17a9f0]/40 bg-[#17a9f0]/20 text-[#17a9f0] transition hover:bg-[#17a9f0]/30 disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[8px] text-[#8fa0b4]">
          <span>Press Enter to send</span>
          <span className="flex items-center gap-1"><CornerDownLeft size={9} /> VOICE & RAG ENABLED</span>
        </div>
      </form>
    </div>
  );
}
