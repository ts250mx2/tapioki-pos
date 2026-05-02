'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from '../../ticket/ticket.module.css';

export default function CortePrint() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [statusRes, configRes] = await Promise.all([
      fetch(`/api/cash/status?id=${params.id}`),
      fetch('/api/config/ticket')
    ]);
    const statusData = await statusRes.json();
    const configData = await configRes.json();
    
    setData(statusData.session);
    setConfig(configData);
    
    // Auto-print faster
    setTimeout(() => {
      window.print();
      window.addEventListener('afterprint', () => {
        window.close();
      }, { once: true });
    }, 500);
  };

  if (!data || !config) return <div>Cargando corte...</div>;

  return (
    <div className={styles.ticket}>
      <div className={styles.header}>
        <img src="/logo.png" alt="Logo" style={{ width: '60px', marginBottom: '10px' }} />
        <div className={styles.title}>{config.Header1 || 'CORTE DE CAJA'}</div>
        {config.Header2 && <div>{config.Header2}</div>}
        {config.Header3 && <div>{config.Header3}</div>}
        
        <div className={styles.divider} style={{ margin: '15px 0' }}></div>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>RESUMEN DE CAJA</div>
        <div>ID Apertura: {data.IdApertura}</div>
        <div>Apertura: {new Date(data.FechaApertura).toLocaleString()}</div>
        {data.FechaCierre && <div>Cierre: {new Date(data.FechaCierre).toLocaleString()}</div>}
      </div>

      <div className={styles.divider}></div>
      <div className={styles.sectionTitle}>VENTAS POR PRODUCTO</div>
      <div className={styles.items}>
        <div className={styles.productRow} style={{ fontWeight: 'bold', borderBottom: '1px solid #000' }}>
          <span>PRODUCTO</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span>CANT.</span>
            <span>TOTAL</span>
          </div>
        </div>
        {data.products && data.products.map((p: any, i: number) => (
          <div key={i} className={styles.productRow}>
            <span>{p.Producto}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ minWidth: '35px', textAlign: 'right' }}>{p.Cantidad}</span>
              <span style={{ minWidth: '65px', textAlign: 'right' }}>${p.Total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.divider}></div>
      <div className={styles.sectionTitle}>TICKETS CANCELADOS</div>
      <div className={styles.items}>
        {data.cancelledTickets && data.cancelledTickets.length > 0 ? (
          data.cancelledTickets.map((t: any, i: number) => (
            <div key={i} className={styles.productRow}>
              <span>Folio: #{t.Folio}</span>
              <span>${t.Total.toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', fontSize: '11px' }}>Sin cancelaciones</div>
        )}
      </div>

      <div className={styles.divider}></div>

      <div className={styles.items}>
        <div className={styles.row}>
          <span>FONDO INICIAL</span>
          <span>${data.FondoCaja.toFixed(2)}</span>
        </div>
        <div className={styles.row}>
          <span>VENTAS EFECTIVO</span>
          <span>${(data.Efectivo || 0).toFixed(2)}</span>
        </div>
        <div className={styles.row}>
          <span>VENTAS TARJETA</span>
          <span>${(data.Tarjeta || 0).toFixed(2)}</span>
        </div>
        <div className={styles.row}>
          <span>VENTAS TRANSFERENCIA</span>
          <span>$0.00</span>
        </div>
      </div>

      <div className={styles.divider}></div>

      <div className={styles.footer}>
        <div className={styles.row} style={{ fontSize: '14px', fontWeight: 'bold' }}>
          <span>TOTAL VENTAS</span>
          <span>${(data.TotalVentas || 0).toFixed(2)}</span>
        </div>
        
        <div className={styles.divider} style={{ marginTop: '20px' }}></div>
        <div style={{ marginTop: '40px' }}>
          _________________________
          <br /> Firma Cajero
        </div>
      </div>
    </div>
  );
}
