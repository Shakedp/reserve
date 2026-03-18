import { neon } from '@neondatabase/serverless';

const DATABASE_URL = import.meta.env.VITE_DATABASE_URL;

let sql;

function getSql() {
  if (!DATABASE_URL) {
    throw new Error('Missing VITE_DATABASE_URL');
  }
  if (!sql) {
    sql = neon(DATABASE_URL);
  }
  return sql;
}

export function normalizeEnglishName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function listUsers() {
  const rows = await getSql()`
    SELECT
      english_name AS "englishName",
      first_name AS "firstName",
      last_name AS "lastName",
      private_number AS "privateNumber",
      id_number AS "idNumber"
    FROM users
    ORDER BY english_name ASC
  `;
  return rows;
}

export async function getUserByEnglishName(englishName) {
  const normalized = normalizeEnglishName(englishName);
  const rows = await getSql()`
    SELECT
      english_name AS "englishName",
      first_name AS "firstName",
      last_name AS "lastName",
      private_number AS "privateNumber",
      id_number AS "idNumber"
    FROM users
    WHERE english_name = ${normalized}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function saveUser(user) {
  const englishName = normalizeEnglishName(user.englishName);
  await getSql()`
    INSERT INTO users (
      english_name,
      first_name,
      last_name,
      private_number,
      id_number
    )
    VALUES (
      ${englishName},
      ${user.firstName},
      ${user.lastName},
      ${user.privateNumber},
      ${user.idNumber}
    )
    ON CONFLICT (english_name) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      private_number = EXCLUDED.private_number,
      id_number = EXCLUDED.id_number,
      updated_at = NOW()
  `;
}

export async function deleteUser(englishName) {
  const normalized = normalizeEnglishName(englishName);
  await getSql()`
    DELETE FROM users
    WHERE english_name = ${normalized}
  `;
}

export async function verifyAdminPassword(password) {
  const rows = await getSql()`
    SELECT password_hash AS "passwordHash"
    FROM admin_auth
    WHERE username = 'admin'
    LIMIT 1
  `;
  const storedHash = rows[0]?.passwordHash;
  if (!storedHash) return false;
  return storedHash === (await sha256Hex(password));
}
