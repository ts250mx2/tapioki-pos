import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get('id');
  const categoryName = searchParams.get('name') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo   = searchParams.get('dateTo')   || '';

  let dateFilter = '';
  let filterParams: any[] = [];

  if (dateFrom && dateTo) {
    dateFilter = `DATE(v.FechaVenta) BETWEEN ? AND ?`;
    filterParams = [dateFrom, dateTo];
  } else {
    dateFilter = `DATE(v.FechaVenta) = CURDATE()`;
  }

  try {
    let query = '';
    let params: any[] = [];

    // If categoryId is present and is a valid number, filter by it.
    // Otherwise, handle the "Sin Categoría" case (where p.IdCategoria is NULL).
    if (categoryId && categoryId !== 'null' && categoryId !== 'undefined') {
      query = `
        SELECT
          p.IdProducto AS id,
          p.Producto AS nombre,
          COALESCE(SUM(d.Cantidad * d.Precio), 0) AS total,
          COALESCE(SUM(d.Cantidad), 0)            AS cantidad
        FROM tblDetalleVentas d
        JOIN tblVentas v ON d.IdVenta = v.IdVenta
        LEFT JOIN tblProductos p ON d.IdProducto = p.IdProducto
        WHERE p.IdCategoria = ? AND ${dateFilter} AND v.Cancelada = 0
        GROUP BY p.IdProducto, p.Producto
        ORDER BY total DESC
      `;
      params = [Number(categoryId), ...filterParams];
    } else {
      query = `
        SELECT
          p.IdProducto AS id,
          p.Producto AS nombre,
          COALESCE(SUM(d.Cantidad * d.Precio), 0) AS total,
          COALESCE(SUM(d.Cantidad), 0)            AS cantidad
        FROM tblDetalleVentas d
        JOIN tblVentas v ON d.IdVenta = v.IdVenta
        LEFT JOIN tblProductos p ON d.IdProducto = p.IdProducto
        WHERE p.IdCategoria IS NULL AND ${dateFilter} AND v.Cancelada = 0
        GROUP BY p.IdProducto, p.Producto
        ORDER BY total DESC
      `;
      params = [...filterParams];
    }

    const [rows] = await pool.query(query, params);
    return NextResponse.json({ products: rows });
  } catch (error: any) {
    console.error('Error fetching category details:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
