import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM tblRetiros 
      WHERE IdRetiro = ?
    `, [params.id]);

    const movement = (rows as any[])[0];
    if (!movement) return NextResponse.json({ message: 'No encontrado' }, { status: 404 });

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Fetch single movement error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
