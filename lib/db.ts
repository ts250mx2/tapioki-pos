import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '74.208.192.90',
  user: 'kyk',
  password: 'merkurio',
  database: 'HP_Tapioki',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
