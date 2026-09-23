'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Send, X, Database, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import { useTapiChat } from './TapiChatContext';
import styles from './TapiAssistant.module.css';

const SUGGESTIONS = [
  '¿Cuánto vendí hoy?',
  'Top 5 productos del mes',
  'Ventas por categoría esta semana',
  '¿Cuál es mi hora pico de ventas?',
];

/* ── Carita clásica de Tapi con volumen 3D ── */
export function TapiFace({ size = 40 }: { size?: number }) {
  const id = useId().replace(/:/g, '');

  return (
    <svg
      className={styles.tapiMascot}
      width={size}
      height={size}
      viewBox="0 0 112 116"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="32%" cy="25%" r="72%">
          <stop offset="0%" stopColor="#fffbd0" />
          <stop offset="18%" stopColor="#ffe967" />
          <stop offset="67%" stopColor="#fbc02d" />
          <stop offset="100%" stopColor="#dc8715" />
        </radialGradient>
        <radialGradient id={`${id}-cheek`} cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffb4c1" />
          <stop offset="100%" stopColor="#ed6682" />
        </radialGradient>
        <radialGradient id={`${id}-eye`} cx="32%" cy="24%" r="75%">
          <stop offset="0%" stopColor="#56515a" />
          <stop offset="50%" stopColor="#242229" />
          <stop offset="100%" stopColor="#09090b" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="20%" y1="10%" x2="85%" y2="92%">
          <stop offset="0%" stopColor="#353238" />
          <stop offset="62%" stopColor="#242127" />
          <stop offset="100%" stopColor="#6f4310" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="170%" height="180%">
          <feDropShadow dx="1" dy="7" stdDeviation="5" floodColor="#7a4a11" floodOpacity=".34" />
        </filter>
        <clipPath id={`${id}-clip`}><circle cx="56" cy="54" r="48" /></clipPath>
      </defs>
      <ellipse cx="57" cy="108" rx="34" ry="5.5" fill="#7b4a16" opacity=".2" />
      <g filter={`url(#${id}-shadow)`}>
        <circle cx="56" cy="54" r="49.5" fill={`url(#${id}-rim)`} />
        <circle cx="56" cy="53" r="47" fill={`url(#${id}-face)`} />
        <g clipPath={`url(#${id}-clip)`}>
          <ellipse cx="36" cy="25" rx="23" ry="12" fill="#fff" opacity=".28" transform="rotate(-24 36 25)" />
          <ellipse cx="93" cy="65" rx="12" ry="36" fill="#a9600f" opacity=".12" transform="rotate(8 93 65)" />
        </g>
        <ellipse cx="32" cy="65" rx="9" ry="7" fill={`url(#${id}-cheek)`} opacity=".88" />
        <ellipse cx="80" cy="65" rx="9" ry="7" fill={`url(#${id}-cheek)`} opacity=".88" />
        <circle cx="40" cy="46" r="6" fill={`url(#${id}-eye)`} />
        <circle cx="72" cy="46" r="6" fill={`url(#${id}-eye)`} />
        <circle cx="42" cy="43.5" r="2" fill="#fff" />
        <circle cx="74" cy="43.5" r="2" fill="#fff" />
        <path d="M37 65c5 11 14 16 19 16s14-5 19-16" fill="none" stroke="#242127" strokeWidth="5" strokeLinecap="round" />
        <path d="M43 69c7 7 19 8 27 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".72" />
      </g>
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
  const { modelo, messages, busy, send, clear } = useTapiChat();
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
            <span className={styles.sub} title={modelo ? `Modelo fijado en HL Console: ${modelo}` : undefined}>
              {modelo ?? (variant === 'page' ? 'Agente inteligente' : 'tu asistente')}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
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
