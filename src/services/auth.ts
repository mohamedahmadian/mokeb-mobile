import bcrypt from "@/src/lib/bcrypt";
import * as SecureStore from "expo-secure-store";
import { boolFromDb, getDatabase } from "@/src/db/client";
import { carPlateFromUser, resolveProfilePlateFields } from "@/src/lib/carPlate";
import {
  formatMobileForLookup,
  getFullNameValidationError,
  getMobileValidationError,
  getNationalIdValidationError,
  getPasswordValidationError,
  toLatinDigits,
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
  plate_two_digit?: string | null;
  plate_serial?: string | null;
  plate_province?: string | null;
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

async function resolveOwnerUserId(
  userId: number,
  roles: RoleName[],
): Promise<number | null> {
  if (roles.includes("MawkibOwner")) return userId;
  if (roles.includes("MawkibServant")) {
    const db = await getDatabase();
    const link = await db.getFirstAsync<{ ownerUserId: number }>(
      "SELECT ownerUserId FROM mawkib_servants WHERE servantUserId = ?",
      [userId],
    );
    return link?.ownerUserId ?? null;
  }
  return null;
}

function mapUser(row: UserRow, roles: RoleName[], ownerUserId: number): User {
  const plateFields = carPlateFromUser({
    plateTwoDigit: row.plate_two_digit,
    plateSerial: row.plate_serial,
    plateProvince: row.plate_province,
    carPlate: row.carPlate,
  });

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
    plateTwoDigit: plateFields.plateTwoDigit || null,
    plateSerial: plateFields.plateSerial || null,
    plateProvince: plateFields.plateProvince || null,
    description: row.description,
    whatsapp: row.whatsapp,
    telegram: row.telegram,
    bale: row.bale,
    eitaa: row.eitaa,
    email: row.email,
    isActive: boolFromDb(row.isActive),
    createdAt: row.createdAt,
    roles,
    ownerUserId,
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
  const ownerUserId = await resolveOwnerUserId(row.id, roles);
  if (ownerUserId == null) return null;
  return mapUser(row, roles, ownerUserId);
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
  const passwordHash = await bcrypt.hash(toLatinDigits(input.password), 10);

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
  const mobileNumber = toLatinDigits(input.mobileNumber);
  const password = toLatinDigits(input.password);

  const mobileError = getMobileValidationError(mobileNumber);
  if (mobileError) throw new Error(mobileError);
  if (!password) throw new Error("رمز عبور را وارد کنید");

  const row = await findUserRowByMobile(mobileNumber);
  if (!row || !boolFromDb(row.isActive)) {
    throw new Error("شماره موبایل یا رمز عبور اشتباه است");
  }

  const valid = await bcrypt.compare(password, row.passwordHash);
  if (!valid) throw new Error("شماره موبایل یا رمز عبور اشتباه است");

  const roles = await getUserRoles(row.id);
  const canLogin =
    roles.includes("MawkibOwner") || roles.includes("MawkibServant");
  if (!canLogin) {
    throw new Error("فقط موکب‌داران و خادمین می‌توانند وارد شوند");
  }

  const ownerUserId = await resolveOwnerUserId(row.id, roles);
  if (ownerUserId == null) {
    throw new Error("حساب خادم به موکب‌داری متصل نیست");
  }

  const user = mapUser(row, roles, ownerUserId);
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

/** به‌روزرسانی فیلدهای پروفایل در جدول users (بدون وابستگی به نقش ورود) */
export async function applyUserProfileUpdate(
  userId: number,
  input: UserProfileInput,
): Promise<void> {
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
  const exists = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE id = ?",
    [userId],
  );
  if (!exists) throw new Error("کاربر یافت نشد");

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
  const plateFields = resolveProfilePlateFields(input);
  if (plateFields) {
    addText("carPlate", plateFields.carPlate);
    addText("plate_two_digit", plateFields.plateTwoDigit || null);
    addText("plate_serial", plateFields.plateSerial || null);
    addText("plate_province", plateFields.plateProvince || null);
  } else {
    addText("carPlate", input.carPlate);
  }
  addText("description", input.description);
  addText("whatsapp", input.whatsapp);
  addText("telegram", input.telegram);
  addText("bale", input.bale);
  addText("eitaa", input.eitaa);
  addText("email", input.email);

  if (updates.length === 0) return;

  values.push(userId);
  await db.runAsync(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    values,
  );
}

export async function updateProfile(
  userId: number,
  input: UserProfileInput,
): Promise<User> {
  await applyUserProfileUpdate(userId, input);
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
