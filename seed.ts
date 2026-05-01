import pool from './lib/db';

async function seed() {
  try {
    // 1. Seed Users
    const [users] = await pool.query('SELECT * FROM tblUsuarios');
    if ((users as any[]).length === 0) {
      console.log('Seeding default admin...');
      await pool.query(
        'INSERT INTO tblUsuarios (IdUsuario, Usuario, IdPuesto, Login, Password, Status) VALUES (?, ?, ?, ?, ?, ?)',
        [1, 'Administrador', 1, 'admin', 'admin123', 1]
      );
    }

    // 2. Seed Categories
    const [categories] = await pool.query('SELECT * FROM tblCategorias');
    if ((categories as any[]).length === 0) {
      console.log('Seeding sample categories...');
      await pool.query('INSERT INTO tblCategorias (IdCategoria, Categoria, EsExtra) VALUES ?', [[
        [1, 'Bebidas', 0],
        [2, 'Tapiocas', 0],
        [3, 'Extras', 1]
      ]]);
    }

    // 3. Seed Products
    const [products] = await pool.query('SELECT * FROM tblProductos');
    if ((products as any[]).length === 0) {
      console.log('Seeding sample products...');
      await pool.query('INSERT INTO tblProductos (IdProducto, Producto, Precio1, Precio2, Precio3, IVA, Status, Multiple, IdCategoria) VALUES ?', [[
        [1, 'Tapioca Fresa', 55, 65, 75, 0, 1, 1, 2],
        [2, 'Tapioca Taro', 60, 70, 80, 0, 1, 1, 2],
        [3, 'Té Verde Matcha', 45, 0, 0, 0, 1, 0, 1],
        [4, 'Agua Embotellada', 20, 0, 0, 0, 1, 0, 1],
        [5, 'Perlas Extra', 15, 0, 0, 0, 1, 0, 3],
        [6, 'Jalea de Piña', 12, 0, 0, 0, 1, 0, 3]
      ]]);
    }

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    process.exit();
  }
}

seed();
