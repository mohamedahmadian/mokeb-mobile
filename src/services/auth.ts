import bcrypt from "@/src/lib/bcrypt";
import * as SecureStore from "expo-secure-store";
import {
  boolFromDb,
  boolToDb,
  generateTrackingCode,
  getDatabase,
} from "@/src/db/client";
import {
  formatMobileForLookup,
  getFullNameValidationError,
  getMobileValidationError,
  getNationalIdValidationError,
  getPasswordValidationError,
  normalizeMobileDigits,
} from "@/src/lib/validation";
import type { RoleName, User, UserProfileInput } from "@/src/types";

const SESSION_KEY = "mokeb_session_user_id";

type UserRow = {
  id: number;
  fullName: string;
  mobileNumber: string;
  nationalId: string | null;
  nationalIdCardImageUrl: string | null;
  imageUrl: string | null;
  gender: "Male" | "Female" | null;
  birthDate: string | null;
  country: string | null;
  passportNumber: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  carPlate: string | null;
  description: string | null;
  whatsapp: string | null;
  telegram: string | null;
  bale: string | null;
  eitaa: string | null;
  email: string | null;
  isActive: number;
  createdAt: string;
  passwordHash: string;
};

async function getUserRoles(userId: number): Promise<RoleName[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: RoleName }>(
    `SELECT r.name FROM roles r
     INNER JOIN user_roles ur ON ur.roleId = r.id
     WHERE ur.userId = ?`,
    [userId],
  );
  return rows.map((row) => row.name);
}

function mapUser(row: UserRow, roles: RoleName[]): User {
  return {
    id: row.id,
    fullName: row.fullName,
    mobileNumber: row.mobileNumber,
    nationalId: row.nationalId,
    nationalIdCardImageUrl: row.nationalIdCardImageUrl,
    imageUrl: row.imageUrl,
    gender: row.gender,
    birthDate: row.birthDate,
    country: row.country,
    passportNumber: row.passportNumber,
    province: row.province,
    city: row.city,
    address: row.address,
    carPlate: row.carPlate,
    description: row.description,
    whatsapp: row.whatsapp,
    telegram: row.telegram,
    bale: row.bale,
    eitaa: row.eitaa,
    email: row.email,
    isActive: boolFromDb(row.isActive),
    createdAt: row.createdAt,
    roles,
  };
}

async function findUserRowByMobile(mobile: string): Promise<UserRow | null> {
  const db = await getDatabase();
  const normalized = formatMobileForLookup(mobile);
  return (
    (await db.getFirstAsync<UserRow>(
      "SELECT * FROM users WHERE mobileNumber = ?",
      [normalized],
    )) ?? null
  );
}

export async function getCurrentSessionUser(): Promise<User | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  const userId = Number(stored);
  if (!Number.isFinite(userId)) return null;
  return getUserById(userId);
}

export async function getUserById(id: number): Promise<User | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE id = ?",
    [id],
  );
  if (!row || !boolFromDb(row.isActive)) return null;
  const roles = await getUserRoles(row.id);
  return mapUser(row, roles);
}

export async function registerMawkibOwner(input: {
  fullName: string;
  mobileNumber: string;
  password: string;
  province?: string;
  city?: string;
}): Promise<User> {
  const fullNameError = getFullNameValidationError(input.fullName);
  if (fullNameError) throw new Error(fullNameError);

  const mobileError = getMobileValidationError(input.mobileNumber);
  if (mobileError) throw new Error(mobileError);

  const passwordError = getPasswordValidationError(input.password);
  if (passwordError) throw new Error(passwordError);

  const mobile = formatMobileForLookup(input.mobileNumber);
  const existing = await findUserRowByMobile(mobile);
  if (existing) throw new Error("این شماره موبایل قبلاً ثبت شده است");

  const db = await getDatabase();
  const passwordHash = await bcrypt.hash(input.password, 10);

  const result = await db.runAsync(
    `INSERT INTO users (fullName, mobileNumber, passwordHash, province, city)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.fullName.trim(),
      mobile,
      passwordHash,
      input.province?.trim() || null,
      input.city?.trim() || null,
    ],
  );

  const userId = result.lastInsertRowId;
  await db.runAsync(
    "INSERT INTO user_roles (userId, roleId) VALUES (?, 1)",
    [userId],
  );

  const user = await getUserById(userId);
  if (!user) throw new Error("خطا در ایجاد حساب کاربری");
  await SecureStore.setItemAsync(SESSION_KEY, String(user.id));
  return user;
}

export async function login(input: {
  mobileNumber: string;
  password: string;
}): Promise<User> {
  const mobileError = getMobileValidationError(input.mobileNumber);
  if (mobileError) throw new Error(mobileError);
  if (!input.password) throw new Error("رمز عبور را وارد کنید");

  const row = await findUserRowByMobile(input.mobileNumber);
  if (!row || !boolFromDb(row.isActive)) {
    throw new Error("شماره موبایل یا رمز عبور اشتباه است");
  }

  const valid = await bcrypt.compare(input.password, row.passwordHash);
  if (!valid) throw new Error("شماره موبایل یا رمز عبور اشتباه است");

  const roles = await getUserRoles(row.id);
  if (!roles.includes("MawkibOwner")) {
    throw new Error("فقط موکب‌داران می‌توانند وارد شوند");
  }

  const user = mapUser(row, roles);
  await SecureStore.setItemAsync(SESSION_KEY, String(user.id));
  return user;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function changePassword(input: {
  userId: number;
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const passwordError = getPasswordValidationError(input.newPassword);
  if (passwordError) throw new Error(passwordError);

  const db = await getDatabase();
  const row = await db.getFirstAsync<{ passwordHash: string }>(
    "SELECT passwordHash FROM users WHERE id = ?",
    [input.userId],
  );
  if (!row) throw new Error("کاربر یافت نشد");

  const valid = await bcrypt.compare(input.currentPassword, row.passwordHash);
  if (!valid) throw new Error("رمز عبور فعلی اشتباه است");

  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await db.runAsync("UPDATE users SET passwordHash = ? WHERE id = ?", [
    passwordHash,
    input.userId,
  ]);
}

export async function updateProfile(
  userId: number,
  input: UserProfileInput,
): Promise<User> {
  const fullNameError = getFullNameValidationError(input.fullName ?? "");
  if (input.fullName !== undefined && fullNameError) {
    throw new Error(fullNameError);
  }
  if (input.mobileNumber !== undefined) {
    const mobileError = getMobileValidationError(input.mobileNumber);
    if (mobileError) throw new Error(mobileError);
  }
  if (input.nationalId !== undefined) {
    const nationalIdError = getNationalIdValidationError(input.nationalId ?? "");
    if (nationalIdError) throw new Error(nationalIdError);
  }

  const db = await getDatabase();
  if (input.mobileNumber !== undefined) {
    const normalizedMobile = formatMobileForLookup(input.mobileNumber);
    const duplicate = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM users WHERE mobileNumber = ? AND id <> ?",
      [normalizedMobile, userId],
    );
    if (duplicate) throw new Error("این شماره موبایل قبلاً ثبت شده است");
  }

  const updates: string[] = [];
  const values: (string | null | number)[] = [];
  const addText = (column: string, value: string | null | undefined) => {
    if (value === undefined) return;
    updates.push(`${column} = ?`);
    values.push(value?.trim() || null);
  };

  addText("fullName", input.fullName);
  if (input.mobileNumber !== undefined) {
    updates.push("mobileNumber = ?");
    values.push(formatMobileForLookup(input.mobileNumber));
  }
  addText("nationalId", input.nationalId);
  addText("nationalIdCardImageUrl", input.nationalIdCardImageUrl);
  addText("imageUrl", input.imageUrl);
  if (input.gender !== undefined) {
    updates.push("gender = ?");
    values.push(input.gender);
  }
  addText("birthDate", input.birthDate);
  addText("country", input.country);
  addText("passportNumber", input.passportNumber);
  addText("province", input.province);
  addText("city", input.city);
  addText("address", input.address);
  addText("carPlate", input.carPlate);
  addText("description", input.description);
  addText("whatsapp", input.whatsapp);
  addText("telegram", input.telegram);
  addText("bale", input.bale);
  addText("eitaa", input.eitaa);
  addText("email", input.email);

  if (updates.length > 0) {
    values.push(userId);
    await db.runAsync(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values,
    );
  }

  const user = await getUserById(userId);
  if (!user) throw new Error("کاربر یافت نشد");
  return user;
}

export async function hasAnyMawkibOwner(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM user_roles WHERE roleId = 1`,
  );
  return (row?.count ?? 0) > 0;
}

export { generateTrackingCode, normalizeMobileDigits, boolToDb, boolFromDb };
