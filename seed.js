import dotenv from 'dotenv';
import { initializeDatabase, findUserByEmail, createUser } from './db.js';
import { hashPassword } from './auth.js';

dotenv.config();

async function seed() {
  const db = initializeDatabase();

  // The properties table seeds itself with two sample listings the first
  // time db.js creates zavilla.db — nothing to do here for that part.

  const existing = findUserByEmail(db, 'agent@zavilla.test');
  if (existing) {
    console.log('Demo user already exists, skipping.');
    return;
  }

  const passwordHash = await hashPassword('password123');
  createUser(db, { name: 'Demo Agent', email: 'agent@zavilla.test', passwordHash, role: 'agent' });
  console.log('Seeded demo user -> email: agent@zavilla.test  password: password123');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
