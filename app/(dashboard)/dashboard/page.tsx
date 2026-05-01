'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) return <div>Cargando estadísticas...</div>;

  const { today, topProducts, alerts } = stats;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Dashboard Administrativo</h1>
        <p className={styles.subtitle}>Resumen del rendimiento de Tapioki POS hoy</p>
      </header>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ background: 'var(--primary-glow)', color: 'var(--primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.label}>Ventas del Día</span>
            <span className={styles.value}>${(today?.total || 0).toFixed(2)}</span>
            <span className={styles.trend}><ArrowUpRight size={14} /> 12% vs ayer</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)' }}>
            <Package size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.label}>Transacciones</span>
            <span className={styles.value}>{today?.count || 0}</span>
            <span className={styles.trend}><ArrowUpRight size={14} /> 5 nuevas</span>
          </div>
        </div>

        <div className={`${styles.statCard} glass`}>
          <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.label}>Alertas Recientes</span>
            <span className={styles.value}>{alerts?.length || 0}</span>
            <span className={styles.trend} style={{ color: 'var(--danger)' }}>Revisar ahora</span>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={`${styles.chartSection} glass`}>
          <h3>Distribución por Pago</h3>
          <div className={styles.paymentList}>
            <div className={styles.paymentRow}>
              <span>Efectivo</span>
              <span>${(today?.efectivo || 0).toFixed(2)}</span>
            </div>
            <div className={styles.paymentRow}>
              <span>Tarjeta</span>
              <span>${(today?.tarjeta || 0).toFixed(2)}</span>
            </div>
            <div className={styles.paymentRow}>
              <span>Transferencia</span>
              <span>${(today?.transferencia || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.topSection} glass`}>
          <h3>Productos Más Vendidos</h3>
          <div className={styles.topList}>
            {topProducts.map((p: any, idx: number) => (
              <div key={idx} className={styles.topItem}>
                <div className={styles.rank}>{idx + 1}</div>
                <div className={styles.topName}>{p.Producto}</div>
                <div className={styles.topCount}>{p.sold} vendidos</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.alertsSection} glass`} style={{ marginTop: '2rem' }}>
        <h3>Registro de Alertas</h3>
        <div className={styles.alertsList}>
          {alerts.map((a: any) => (
            <div key={a.IdAlerta} className={styles.alertItem}>
              <div className={styles.alertTime}>{new Date(a.FechaAlerta).toLocaleTimeString()}</div>
              <div className={styles.alertContent}>{a.Alerta}</div>
              <div className={styles.alertStatus}>Admin</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
