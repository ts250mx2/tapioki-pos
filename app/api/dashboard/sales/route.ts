import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period   = searchParams.get('period')   || 'today'; // today | yesterday | week | month
  const groupBy  = searchParams.get('groupBy')  || 'categoria'; // categoria | producto
  const dateFrom = searchParams.get('dateFrom') || ''; // YYYY-MM-DD
  const dateTo   = searchParams.get('dateTo')   || ''; // YYYY-MM-DD

  // Build date filter — custom range takes priority over period preset
  let dateFilter = '';
  let filterParams: string[] = [];

  if (dateFrom && dateTo) {
    dateFilter = `DATE(v.FechaVenta) BETWEEN ? AND ?`;
    filterParams = [dateFrom, dateTo];
  } else {
    switch (period) {
      case 'today':
        dateFilter = `DATE(v.FechaVenta) = CURDATE()`;
        break;
      case 'yesterday':
        dateFilter = `DATE(v.FechaVenta) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
        break;
      case 'week':
        dateFilter = `v.FechaVenta >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)`;
        break;
      case 'month':
        dateFilter = `v.FechaVenta >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)`;
        break;
      default:
        dateFilter = `DATE(v.FechaVenta) = CURDATE()`;
    }
  }

  try {
    // ── KPI Summary ──────────────────────────────────────────────────────────
    const [kpiRows] = await pool.query(`
      SELECT
        COALESCE(SUM(v.Total), 0)       AS totalVentas,
        COUNT(v.IdVenta)                AS numTransacciones,
        COALESCE(AVG(v.Total), 0)       AS ticketPromedio,
        COALESCE(SUM(v.Efectivo), 0)    AS efectivo,
        COALESCE(SUM(v.Tarjeta), 0)     AS tarjeta,
        COALESCE(SUM(v.Transferencia),0) AS transferencia,
        COALESCE(SUM(v.Cancelada), 0)   AS canceladas
      FROM tblVentas v
      WHERE ${dateFilter} AND v.Cancelada = 0
    `, filterParams);

    // ── Sales Trend by Day ───────────────────────────────────────────────────
    const [trendRows] = await pool.query(`
      SELECT
        DATE(v.FechaVenta)              AS fecha,
        COALESCE(SUM(v.Total), 0)       AS total,
        COUNT(v.IdVenta)                AS transacciones
      FROM tblVentas v
      WHERE ${dateFilter} AND v.Cancelada = 0
      GROUP BY DATE(v.FechaVenta)
      ORDER BY DATE(v.FechaVenta) ASC
    `, filterParams);

    // ── Breakdown by Category or Product ─────────────────────────────────────
    let breakdownRows: any[] = [];
    if (groupBy === 'categoria') {
      const [rows] = await pool.query(`
        SELECT
          COALESCE(c.Categoria, 'Sin Categoría') AS nombre,
          COALESCE(SUM(d.Cantidad * d.Precio), 0) AS total,
          COALESCE(SUM(d.Cantidad), 0)            AS cantidad
        FROM tblDetalleVentas d
        JOIN tblVentas v ON d.IdVenta = v.IdVenta
        LEFT JOIN tblProductos p ON d.IdProducto = p.IdProducto
        LEFT JOIN tblCategorias c ON p.IdCategoria = c.IdCategoria
        WHERE ${dateFilter} AND v.Cancelada = 0
        GROUP BY c.IdCategoria, c.Categoria
        ORDER BY total DESC
        LIMIT 10
      `, filterParams);
      breakdownRows = rows as any[];
    } else {
      const [rows] = await pool.query(`
        SELECT
          COALESCE(p.Producto, 'Sin Producto') AS nombre,
          COALESCE(SUM(d.Cantidad * d.Precio), 0) AS total,
          COALESCE(SUM(d.Cantidad), 0)            AS cantidad
        FROM tblDetalleVentas d
        JOIN tblVentas v ON d.IdVenta = v.IdVenta
        LEFT JOIN tblProductos p ON d.IdProducto = p.IdProducto
        WHERE ${dateFilter} AND v.Cancelada = 0
        GROUP BY d.IdProducto, p.Producto
        ORDER BY total DESC
        LIMIT 10
      `, filterParams);
      breakdownRows = rows as any[];
    }

    // ── Hourly Heatmap (hour 0–23, days of week 0–6) ────────────────────────
    const [heatmapRows] = await pool.query(`
      SELECT
        (DAYOFWEEK(v.FechaVenta) - 1)  AS diaSemana,
        HOUR(v.FechaVenta)             AS hora,
        COALESCE(SUM(v.Total), 0)      AS total,
        COUNT(v.IdVenta)               AS transacciones
      FROM tblVentas v
      WHERE ${dateFilter} AND v.Cancelada = 0
      GROUP BY (DAYOFWEEK(v.FechaVenta) - 1), HOUR(v.FechaVenta)
      ORDER BY (DAYOFWEEK(v.FechaVenta) - 1), HOUR(v.FechaVenta)
    `, filterParams);

    return NextResponse.json({
      kpi: (kpiRows as any[])[0],
      trend: trendRows,
      breakdown: breakdownRows,
      heatmap: heatmapRows,
    });
  } catch (error: any) {
    console.error('Dashboard sales error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
