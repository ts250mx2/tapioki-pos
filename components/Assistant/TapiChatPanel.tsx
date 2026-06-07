'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, X, Database, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { useTapiChat, type ModelKey } from './TapiChatContext';
import styles from './TapiAssistant.module.css';

const MODEL_OPTIONS: { key: ModelKey; label: string }[] = [
  { key: 'haiku',  label: 'Haiku · rápido' },
  { key: 'sonnet', label: 'Sonnet · equilibrio' },
  { key: 'opus',   label: 'Opus · potente' },
];

const SUGGESTIONS = [
  '¿Cuánto vendí hoy?',
  'Top 5 productos del mes',
  'Ventas por categoría esta semana',
  '¿Cuál es mi hora pico de ventas?',
];

/* ── Carita feliz estilo logo Tapioki ── */
export function TapiFace({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id="tapiYellow" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffe65a" />
          <stop offset="100%" stopColor="#f9a825" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#tapiYellow)" stroke="#1a1a1a" strokeWidth="4" />
      {/* cachetes */}
      <circle cx="28" cy="60" r="8" fill="#ff8da1" opacity="0.85" />
      <circle cx="72" cy="60" r="8" fill="#ff8da1" opacity="0.85" />
      {/* ojos */}
      <circle cx="35" cy="42" r="5.5" fill="#1a1a1a" />
      <circle cx="65" cy="42" r="5.5" fill="#1a1a1a" />
      <circle cx="37" cy="40" r="1.8" fill="#fff" />
      <circle cx="67" cy="40" r="1.8" fill="#fff" />
      {/* sonrisa */}
      <path d="M32 60 Q50 78 68 60" fill="none" stroke="#1a1a1a" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Mini-formato: escapa HTML y aplica **negrita**, `código` y saltos de línea ── */
function renderContent(text: string): string {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

interface TapiChatPanelProps {
  variant: 'widget' | 'page';
  onClose?: () => void;
  onMaximize?: () => void;
  onMinimize?: () => void;
}

export default function TapiChatPanel({ variant, onClose, onMaximize, onMinimize }: TapiChatPanelProps) {
  const { model, changeModel, messages, busy, send, clear } = useTapiChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    setInput('');
    send(text);
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <TapiFace size={variant === 'page' ? 40 : 34} />
          <div className={styles.brandText}>
            <span className={styles.name}>Tapi</span>
            <span className={styles.sub}>{variant === 'page' ? 'Agente inteligente' : 'tu asistente'}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <select
            className={styles.modelSelect}
            value={model}
            onChange={(e) => changeModel(e.target.value as ModelKey)}
            title="Modelo de IA"
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button className={styles.iconBtn} onClick={clear} title="Limpiar conversación">
              <Trash2 size={17} />
            </button>
          )}
          {onMaximize && (
            <button className={styles.iconBtn} onClick={onMaximize} title="Maximizar">
              <Maximize2 size={17} />
            </button>
          )}
          {onMinimize && (
            <button className={styles.iconBtn} onClick={onMinimize} title="Minimizar">
              <Minimize2 size={17} />
            </button>
          )}
          {onClose && (
            <button className={styles.iconBtn} onClick={onClose} title="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <div className={styles.messages} ref={scrollRef}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <TapiFace size={64} />
            <p className={styles.welcomeTitle}>¡Hola! Soy Tapi 🧋</p>
            <p className={styles.welcomeText}>
              Pregúntame sobre tus ventas, productos, categorías o cajas. Consulto tus datos en tiempo real.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className={styles.suggestion} onClick={() => submit(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.assistant}`}>
            {m.role === 'assistant' && (
              <div className={styles.avatar}><TapiFace size={26} /></div>
            )}
            <div className={`${styles.bubble} ${variant === 'page' ? styles.bubbleWide : ''}`}>
              {m.querying && (
                <div className={styles.querying}><Database size={13} /> Consultando la base de datos…</div>
              )}
              {m.content && (
                <div className={styles.text} dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
              )}
              {m.streaming && !m.content && !m.querying && (
                <div className={styles.dots}><span /><span /><span /></div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        className={styles.inputBar}
        onSubmit={(e) => { e.preventDefault(); submit(input); }}
      >
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={busy}
          autoFocus
        />
        <button className={styles.sendBtn} type="submit" disabled={busy || !input.trim()} title="Enviar">
          <Send size={18} />
        </button>
      </form>
    </>
  );
}
