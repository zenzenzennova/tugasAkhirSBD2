require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'midnight_meridian',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});

const SALT_ROUNDS = 10;

const users = [
  {
    username: 'owner',
    full_name: 'Sesilia Endira - Owner',
    role: 'owner',
    password: 'admin123',
  },
  {
    username: 'kasir1',
    full_name: 'Ahmad Kasir Toko',
    role: 'kasir',
    password: 'kasir123',
  },
];

async function seedUsers() {
  console.log('Starting user seed...');

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, full_name, role`,
      [user.username, passwordHash, user.full_name, user.role]
    );

    if (result.rowCount > 0) {
      const row = result.rows[0];
      console.log(`✓ User created: [${row.role.toUpperCase()}] ${row.username} (${row.full_name})`);
    } else {
      console.log(`– User already exists, skipped: ${user.username}`);
    }
  }

  console.log('\nUser seed completed successfully.');
}

async function main() {
  try {
    await seedUsers();
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main();
