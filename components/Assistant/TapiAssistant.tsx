'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import TapiChatPanel, { TapiFace } from './TapiChatPanel';
import styles from './TapiAssistant.module.css';

const FULL_PAGE_PATH = '/agente-inteligente';

export default function TapiAssistant() {
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Solo administradores (mismo criterio que el dashboard)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved && JSON.parse(saved)?.IdPuesto === 1) setAllowed(true);
    } catch { /* ignore */ }
  }, []);

  // En la página de pantalla completa el widget flotante no se muestra (ya está maximizado ahí)
  if (!allowed || pathname === FULL_PAGE_PATH) return null;

  return (
    <>
      {/* Botón flotante carita feliz */}
      {!open && (
        <button
          className={styles.fab}
          onClick={() => setOpen(true)}
          title="Pregúntale a Tapi"
          aria-label="Abrir asistente Tapi"
        >
          <TapiFace size={46} />
          <span className={styles.fabSpark}><Sparkles size={14} /></span>
        </button>
      )}

      {/* Panel del chat */}
      {open && (
        <div className={`${styles.panel} glass`}>
          <TapiChatPanel
            variant="widget"
            onClose={() => setOpen(false)}
            onMaximize={() => {
              setOpen(false);
              router.push(FULL_PAGE_PATH);
            }}
          />
        </div>
      )}
    </>
  );
}
