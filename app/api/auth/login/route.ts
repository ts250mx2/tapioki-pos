import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { serialize } from 'cookie';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const [rows] = await pool.query(
      'SELECT IdUsuario, Usuario, IdPuesto, Status FROM tblUsuarios WHERE Login = ? AND Password = ? AND Status = 1',
      [username, password]
    );

    const users = rows as any[];

    if (users.length > 0) {
      const user = users[0];
      
      // In a real app, use JWT and secure cookies
      // For this POS, we'll set a simple cookie
      const cookie = serialize('auth_session', JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      });

      const response = NextResponse.json({
        success: true,
        user: {
          IdUsuario: user.IdUsuario,
          Usuario: user.Usuario,
          IdPuesto: user.IdPuesto
        }
      });

      response.headers.set('Set-Cookie', cookie);
      return response;
    }

    return NextResponse.json(
      { message: 'Credenciales inválidas' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
