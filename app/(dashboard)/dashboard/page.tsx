'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, ShoppingBag, ReceiptText, Banknote,
  CreditCard, Smartphone, XCircle, BarChart2,
  Calendar, Layers, Package, ChevronDown,
} from 'lucide-react';
import styles from './dashboard.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────
type Period   = 'today' | 'yesterday' | 'week' | 'month';
type GroupBy  = 'categoria' | 'producto';

interface KPI {
  totalVentas: number;
  numTransacciones: number;
  ticketPromedio: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  canceladas: number;
}

interface TrendPoint { fecha: string; total: number; transacciones: number; }
interface BreakItem  { nombre: string; total: number; cantidad: number; }
interface HeatCell   { diaSemana: number; hora: number; total: number; transacciones: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n || 0);

const fmtShort = (n: number) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};

const DAYS_ES  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOURS    = Array.from({ length: 24 }, (_, i) => i);

// Build a normalised trend with filled-in days even if no data
function buildTrendData(raw: TrendPoint[], period: Period): TrendPoint[] {
  if (raw.length === 0) return [];
  const map: Record<string, TrendPoint> = {};
  raw.forEach(r => { map[r.fecha.split('T')[0]] = r; });
  return raw.map(r => map[r.fecha.split('T')[0]] || { fecha: r.fecha, total: 0, transacciones: 0 });
}

// ─── Mini SVG Line Chart ──────────────────────────────────────────────────────
function LineChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) return <div className={styles.chartEmpty}>Sin datos para el período</div>;

  const W = 780, H = 200, PAD = { t: 16, r: 20, b: 40, l: 60 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const toX    = (i: number) => PAD.l + (i / Math.max(data.length - 1, 1)) * innerW;
  const toY    = (v: number) => PAD.t + innerH - (v / maxVal) * innerH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.total)}`).join(' ');
  const areaPoints = [
    `${PAD.l},${PAD.t + innerH}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.total)}`),
    `${toX(data.length - 1)},${PAD.t + innerH}`,
  ].join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => ({ v: maxVal * r, y: toY(maxVal * r) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--pink)"     stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--pink)"     stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y-grid */}
      {yTicks.map(({ v, y }) => (
        <g key={v}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border)" strokeWidth="1" />
          <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">{fmtShort(v)}</text>
        </g>
      ))}

      {/* Area fill */}
      <polygon points={areaPoints} fill="url(#lineGrad)" />

      {/* Line */}
      <polyline points={points} fill="none" stroke="var(--pink)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots + labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.total)} r="4" fill="var(--pink)" stroke="var(--surface)" strokeWidth="2" />
          <text
            x={toX(i)} y={PAD.t + innerH + 18}
            textAnchor="middle" fontSize="10" fill="var(--text-muted)"
          >
            {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Mini Horizontal Bar Chart ───────────────────────────────────────────────
function BarChart({ data }: { data: BreakItem[] }) {
  if (data.length === 0) return <div className={styles.chartEmpty}>Sin datos para el período</div>;
  const max = Math.max(...data.map(d => d.total), 1);
  const COLORS = ['var(--pink)', 'var(--cyan)', 'var(--yellow)', 'var(--pink-deep)', 'var(--cyan-deep)',
                  '#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#f472b6'];
  return (
    <div className={styles.barList}>
      {data.map((item, i) => (
        <div key={i} className={styles.barRow}>
          <div className={styles.barLabel} title={item.nombre}>{item.nombre}</div>
          <div className={styles.barTrack}>
            <div
              className={styles.barFill}
              style={{ width: `${(item.total / max) * 100}%`, background: COLORS[i % COLORS.length] }}
            />
          </div>
          <div className={styles.barValue}>{fmt(item.total)}</div>
          <div className={styles.barCount}>{item.cantidad} uds</div>
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
function Heatmap({ data }: { data: HeatCell[] }) {
  // Build a lookup: [day][hour] => total
  const map: Record<string, number> = {};
  let maxVal = 0;
  data.forEach(c => {
    const key = `${c.diaSemana}-${c.hora}`;
    map[key] = c.total;
    if (c.total > maxVal) maxVal = c.total;
  });

  if (maxVal === 0) return <div className={styles.chartEmpty}>Sin datos para el período</div>;

  return (
    <div className={styles.heatmapWrap}>
      <div className={styles.heatmapGrid}>
        {/* Header row */}
        <div className={styles.heatCorner} />
        {HOURS.map(h => (
          <div key={h} className={styles.heatHour}>{h}h</div>
        ))}

        {/* Rows per day */}
        {DAYS_ES.map((day, d) => (
          <>
            <div key={`day-${d}`} className={styles.heatDay}>{day}</div>
            {HOURS.map(h => {
              const val = map[`${d}-${h}`] || 0;
              const intensity = maxVal > 0 ? val / maxVal : 0;
              return (
                <div
                  key={`${d}-${h}`}
                  className={styles.heatCell}
                  title={`${day} ${h}:00 — ${fmt(val)}`}
                  style={{
                    background: intensity === 0
                      ? 'var(--surface-2)'
                      : `rgba(255,109,130,${0.12 + intensity * 0.88})`,
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      {/* Legend */}
      <div className={styles.heatLegend}>
        <span>Menos ventas</span>
        <div className={styles.heatLegendBar} />
        <span>Más ventas</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [period,   setPeriod]   = useState<Period>('today');
  const [groupBy,  setGroupBy]  = useState<GroupBy>('categoria');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [data,     setData]     = useState<any>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  const fetchData = useCallback(async (
    p: Period, g: GroupBy, from: string, to: string
  ) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ period: p, groupBy: g });
      if (from && to) { params.set('dateFrom', from); params.set('dateTo', to); }
      const res = await fetch(`/api/dashboard/sales?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period, groupBy, dateFrom, dateTo);
  }, [period, groupBy, dateFrom, dateTo, fetchData]);

  // When a preset is clicked, clear any custom range
  const handlePeriod = (p: Period) => {
    setDateFrom('');
    setDateTo('');
    setPeriod(p);
  };

  // When a date changes, deselect period visually (keep it for fallback)
  const handleDateFrom = (v: string) => { setDateFrom(v); };
  const handleDateTo   = (v: string) => { setDateTo(v); };

  const isCustomRange = !!(dateFrom && dateTo);


  const periodLabel: Record<Period, string> = {
    today:     'Hoy',
    yesterday: 'Ayer',
    week:      'Últimos 7 días',
    month:     'Últimos 30 días',
  };

  const activeLabel = isCustomRange
    ? `${dateFrom} → ${dateTo}`
    : periodLabel[period];

  const kpi: KPI = data?.kpi ?? {
    totalVentas: 0, numTransacciones: 0, ticketPromedio: 0,
    efectivo: 0, tarjeta: 0, transferencia: 0, canceladas: 0,
  };

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <BarChart2 size={32} color="var(--primary)" />
          <div>
            <h1>Dashboard de Ventas</h1>
            <p className={styles.subtitle}>Análisis de rendimiento y KPIs — {activeLabel}</p>
          </div>
        </div>

        <div className={styles.filterBar}>
          {/* Period buttons */}
          <div className={styles.periodBar}>
            {(['today','yesterday','week','month'] as Period[]).map(p => (
              <button
                key={p}
                id={`period-${p}`}
                className={`${styles.periodBtn} ${!isCustomRange && period === p ? styles.periodActive : ''}`}
                onClick={() => handlePeriod(p)}
              >
                {p === 'today'     && <><Calendar size={14} /> Hoy</>}
                {p === 'yesterday' && <><Calendar size={14} /> Ayer</>}
                {p === 'week'      && <><Calendar size={14} /> Semana</>}
                {p === 'month'     && <><Calendar size={14} /> Mes</>}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className={styles.dateRange}>
            <span className={styles.dateRangeLabel}>Rango personalizado:</span>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={e => handleDateFrom(e.target.value)}
              className={styles.dateInput}
            />
            <span className={styles.dateSep}>→</span>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={e => handleDateTo(e.target.value)}
              className={styles.dateInput}
            />
            {isCustomRange && (
              <button
                className={styles.dateClear}
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                title="Limpiar rango"
              >✕</button>
            )}
          </div>
        </div>
      </header>

      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* ── KPI Cards ── */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} glass ${styles.kpiMain}`}>
          <div className={styles.kpiIcon} style={{ background: 'var(--pink-glow)', color: 'var(--pink)' }}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Ventas Totales</span>
            <span className={styles.kpiValue}>{loading ? '—' : fmt(kpi.totalVentas)}</span>
            <span className={styles.kpiSub}>{periodLabel[period]}</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(93,224,230,0.12)', color: 'var(--cyan)' }}>
            <ReceiptText size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Transacciones</span>
            <span className={styles.kpiValue}>{loading ? '—' : kpi.numTransacciones}</span>
            <span className={styles.kpiSub}>tickets procesados</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(253,216,53,0.12)', color: 'var(--yellow-deep)' }}>
            <ShoppingBag size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Ticket Promedio</span>
            <span className={styles.kpiValue}>{loading ? '—' : fmt(kpi.ticketPromedio)}</span>
            <span className={styles.kpiSub}>por venta</span>
          </div>
        </div>

        <div className={`${styles.kpiCard} glass`}>
          <div className={styles.kpiIcon} style={{ background: 'rgba(245,101,101,0.10)', color: 'var(--danger)' }}>
            <XCircle size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Cancelaciones</span>
            <span className={styles.kpiValue}>{loading ? '—' : kpi.canceladas}</span>
            <span className={styles.kpiSub}>en el período</span>
          </div>
        </div>
      </div>

      {/* ── Payment breakdown mini cards ── */}
      <div className={styles.payGrid}>
        <div className={`${styles.payCard} glass`}>
          <Banknote size={18} color="var(--secondary)" />
          <span className={styles.payLabel}>Efectivo</span>
          <span className={styles.payVal}>{loading ? '—' : fmt(kpi.efectivo)}</span>
        </div>
        <div className={`${styles.payCard} glass`}>
          <CreditCard size={18} color="var(--pink)" />
          <span className={styles.payLabel}>Tarjeta</span>
          <span className={styles.payVal}>{loading ? '—' : fmt(kpi.tarjeta)}</span>
        </div>
        <div className={`${styles.payCard} glass`}>
          <Smartphone size={18} color="var(--yellow-deep)" />
          <span className={styles.payLabel}>Transferencia</span>
          <span className={styles.payVal}>{loading ? '—' : fmt(kpi.transferencia)}</span>
        </div>
      </div>

      {/* ── Trend Chart ── */}
      <div className={`${styles.chartCard} glass`}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Tendencia de Ventas</h3>
            <p className={styles.chartSub}>Ventas por día en el período seleccionado</p>
          </div>
        </div>
        <div className={styles.chartBody}>
          {loading
            ? <div className={styles.chartEmpty}>Cargando...</div>
            : <LineChart data={(data?.trend ?? []).map((r: any) => ({ ...r, fecha: r.fecha?.split('T')[0] ?? r.fecha }))} />
          }
        </div>
      </div>

      {/* ── Breakdown Chart ── */}
      <div className={`${styles.chartCard} glass`}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Ventas por {groupBy === 'categoria' ? 'Categoría' : 'Producto'}</h3>
            <p className={styles.chartSub}>Desglose del período seleccionado</p>
          </div>
          <div className={styles.groupBtns}>
            <button
              id="group-categoria"
              className={`${styles.groupBtn} ${groupBy === 'categoria' ? styles.groupActive : ''}`}
              onClick={() => setGroupBy('categoria')}
            >
              <Layers size={14} /> Categoría
            </button>
            <button
              id="group-producto"
              className={`${styles.groupBtn} ${groupBy === 'producto' ? styles.groupActive : ''}`}
              onClick={() => setGroupBy('producto')}
            >
              <Package size={14} /> Producto
            </button>
          </div>
        </div>
        <div className={styles.chartBody}>
          {loading
            ? <div className={styles.chartEmpty}>Cargando...</div>
            : <BarChart data={data?.breakdown ?? []} />
          }
        </div>
      </div>

      {/* ── Heatmap ── */}
      <div className={`${styles.chartCard} glass`}>
        <div className={styles.chartHeader}>
          <div>
            <h3 className={styles.chartTitle}>Mapa de Calor por Hora</h3>
            <p className={styles.chartSub}>Concentración de ventas por día de la semana y hora del día</p>
          </div>
        </div>
        <div className={styles.chartBody}>
          {loading
            ? <div className={styles.chartEmpty}>Cargando...</div>
            : <Heatmap data={data?.heatmap ?? []} />
          }
        </div>
      </div>
    </div>
  );
}
