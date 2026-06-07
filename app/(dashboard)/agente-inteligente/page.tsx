'use client';

import { useRouter } from 'next/navigation';
import TapiChatPanel from '@/components/Assistant/TapiChatPanel';
import styles from './agente.module.css';

export default function AgenteInteligentePage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={`${styles.card} glass`}>
        <TapiChatPanel variant="page" onMinimize={() => router.push('/dashboard')} />
      </div>
    </div>
  );
}
