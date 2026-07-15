import bcrypt from "@/src/lib/bcrypt";
import { boolFromDb, getDatabase } from "@/src/db/client";
import {
  formatMobileForLookup,
  getFullNameValidationError,
  getMobileValidationError,
  getPasswordValidationError,
  toLatinDigits,
} from "@/src/lib/validation";
import type { User } from "@/src/types";

const SERVANT_ROLE_ID = 3;

type ServantRow = {
  id: number;
  fullName: string;
  mobileNumber: string;
  isActive: number;
  createdAt: string;
};

function mapServant(row: ServantRow): User {
  return {
    id: row.id,
    fullName: row.fullName,
    mobileNumber: row.mobileNumber,
    isActive: boolFromDb(row.isActive),
    createdAt: row.createdAt,
    roles: ["MawkibServant"],
    ownerUserId: 0,
  };
}

export async function listServants(ownerUserId: number): Promise<User[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ServantRow>(
    `SELECT u.id, u.fullName, u.mobileNumber, u.isActive, u.createdAt
     FROM mawkib_servants ms
     INNER JOIN users u ON u.id = ms.servantUserId
     WHERE ms.ownerUserId = ?
     ORDER BY u.createdAt DESC`,
    [ownerUserId],
  );
  return rows.map((row) => ({
    ...mapServant(row),
    ownerUserId,
  }));
}

export async function countServants(ownerUserId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM mawkib_servants WHERE ownerUserId = ?`,
    [ownerUserId],
  );
  return row?.count ?? 0;
}

export type ServantInput = {
  fullName: string;
  mobileNumber: string;
  password?: string;
};

export async function createServant(
  ownerUserId: number,
  input: ServantInput,
): Promise<User> {
  const fullNameError = getFullNameValidationError(input.fullName);
  if (fullNameError) throw new Error(fullNameError);

  const mobileError = getMobileValidationError(input.mobileNumber);
  if (mobileError) throw new Error(mobileError);

  const passwordError = getPasswordValidationError(input.password ?? "");
  if (passwordError) throw new Error(passwordError);

  const mobile = formatMobileForLookup(input.mobileNumber);
  const db = await getDatabase();

  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE mobileNumber = ?",
    [mobile],
  );
  if (existing) throw new Error("این شماره موبایل قبلاً ثبت شده است");

  const passwordHash = await bcrypt.hash(
    toLatinDigits(input.password!),
    10,
  );

  const result = await db.runAsync(
    `INSERT INTO users (fullName, mobileNumber, passwordHash)
     VALUES (?, ?, ?)`,
    [input.fullName.trim(), mobile, passwordHash],
  );

  const servantId = result.lastInsertRowId;
  await db.runAsync(
    "INSERT INTO user_roles (userId, roleId) VALUES (?, ?)",
    [servantId, SERVANT_ROLE_ID],
  );
  await db.runAsync(
    "INSERT INTO mawkib_servants (servantUserId, ownerUserId) VALUES (?, ?)",
    [servantId, ownerUserId],
  );

  const created = await db.getFirstAsync<ServantRow>(
    `SELECT id, fullName, mobileNumber, isActive, createdAt
     FROM users WHERE id = ?`,
    [servantId],
  );
  if (!created) throw new Error("خطا در ایجاد خادم");
  return { ...mapServant(created), ownerUserId };
}

export async function updateServant(
  ownerUserId: number,
  servantId: number,
  input: ServantInput,
): Promise<User> {
  const fullNameError = getFullNameValidationError(input.fullName);
  if (fullNameError) throw new Error(fullNameError);

  const mobileError = getMobileValidationError(input.mobileNumber);
  if (mobileError) throw new Error(mobileError);

  const db = await getDatabase();
  const link = await db.getFirstAsync<{ servantUserId: number }>(
    `SELECT servantUserId FROM mawkib_servants
     WHERE servantUserId = ? AND ownerUserId = ?`,
    [servantId, ownerUserId],
  );
  if (!link) throw new Error("خادم یافت نشد");

  const mobile = formatMobileForLookup(input.mobileNumber);
  const duplicate = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE mobileNumber = ? AND id <> ?",
    [mobile, servantId],
  );
  if (duplicate) throw new Error("این شماره موبایل قبلاً ثبت شده است");

  if (input.password?.trim()) {
    const passwordError = getPasswordValidationError(input.password);
    if (passwordError) throw new Error(passwordError);
    const passwordHash = await bcrypt.hash(
      toLatinDigits(input.password),
      10,
    );
    await db.runAsync(
      `UPDATE users
       SET fullName = ?, mobileNumber = ?, passwordHash = ?
       WHERE id = ?`,
      [input.fullName.trim(), mobile, passwordHash, servantId],
    );
  } else {
    await db.runAsync(
      `UPDATE users SET fullName = ?, mobileNumber = ? WHERE id = ?`,
      [input.fullName.trim(), mobile, servantId],
    );
  }

  const updated = await db.getFirstAsync<ServantRow>(
    `SELECT id, fullName, mobileNumber, isActive, createdAt
     FROM users WHERE id = ?`,
    [servantId],
  );
  if (!updated) throw new Error("خادم یافت نشد");
  return { ...mapServant(updated), ownerUserId };
}

export async function deleteServant(
  ownerUserId: number,
  servantId: number,
): Promise<void> {
  const db = await getDatabase();
  const link = await db.getFirstAsync<{ servantUserId: number }>(
    `SELECT servantUserId FROM mawkib_servants
     WHERE servantUserId = ? AND ownerUserId = ?`,
    [servantId, ownerUserId],
  );
  if (!link) throw new Error("خادم یافت نشد");

  await db.runAsync(
    "DELETE FROM mawkib_servants WHERE servantUserId = ? AND ownerUserId = ?",
    [servantId, ownerUserId],
  );
  await db.runAsync("DELETE FROM user_roles WHERE userId = ?", [servantId]);
  await db.runAsync("DELETE FROM users WHERE id = ?", [servantId]);
}
