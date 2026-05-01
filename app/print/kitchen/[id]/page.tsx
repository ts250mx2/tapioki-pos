'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from '../kitchen.module.css';

export default function KitchenPrint() {
  const params = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/sales/${params.id}`);
      if (!res.ok) throw new Error('Venta no encontrada');
      const ticketData = await res.json();
      setData(ticketData);

      // Auto-print
      setTimeout(() => {
        window.print();
        window.addEventListener('afterprint', () => {
          window.close();
        }, { once: true });
      }, 800);
    } catch (err) {
      console.error('Error fetching kitchen data:', err);
      setData({ error: true });
    }
  };

  if (!data) return <div className={styles.ticket}>Cargando orden...</div>;
  if (data.error || !data.venta) return <div className={styles.ticket}>Error: No se pudo cargar la orden</div>;

  const { venta, details } = data;

  return (
    <div className={styles.ticket}>
      <div className={styles.header}>
        <div className={styles.title}>COCINA</div>
        <div style={{ fontSize: '14px' }}>Folio: {venta.Folio}</div>
      </div>

      {venta.Cliente && (
        <div className={styles.cliente}>
          PARA: {venta.Cliente.toUpperCase()}
        </div>
      )}

      <div className={styles.divider}></div>

      <div className={styles.items}>
        {details.map((item: any, idx: number) => (
          <div key={idx} className={item.EsExtra === 1 ? styles.extras : styles.item}>
            <div className={styles.itemMain}>
              {item.EsExtra === 1 ? (
                <span>+ {item.Producto}</span>
              ) : (
                <>
                  <span>[{item.Cantidad}]</span>
                  <span>{item.Producto}</span>
                </>
              )}
            </div>
            {item.EsExtra !== 1 && item.TipoPrecio > 0 && (
              <div style={{ 
                fontSize: '22px', 
                fontWeight: '900', 
                marginLeft: '35px', 
                marginTop: '5px',
                border: '2px solid #000',
                padding: '2px 5px',
                display: 'inline-block'
              }}>
                * {
                  item.TipoPrecio === 1 ? 'CHICO' : 
                  (item.TipoPrecio === 2 && item.Precio3 > 0) ? 'MEDIANO' : 'GRANDE'
                }
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.divider}></div>

      <div className={styles.meta}>
        <div>{new Date(venta.FechaVenta).toLocaleString()}</div>
      </div>
    </div>
  );
}
