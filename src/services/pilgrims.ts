import bcrypt from "@/src/lib/bcrypt";
import { boolFromDb, getDatabase } from "@/src/db/client";
import { getUserById, updateProfile } from "@/src/services/auth";
import {
  formatMobileForLookup,
  getFullNameValidationError,
  getMobileValidationError,
  getNationalIdValidationError,
} from "@/src/lib/validation";
import type {
  PilgrimListFilters,
  User,
  UserGender,
  UserProfileInput,
} from "@/src/types";

type PilgrimRow = {
  id: number;
  fullName: string;
  mobileNumber: string;
  nationalId: string | null;
  nationalIdCardImageUrl: string | null;
  imageUrl: string | null;
  gender: UserGender | null;
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
};

function mapPilgrim(row: PilgrimRow): User {
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
    roles: ["Pilgrim"],
  };
}

export async function listPilgrims(
  ownerUserId: number,
  filters: PilgrimListFilters = {},
): Promise<User[]> {
  const db = await getDatabase();
  const clauses = [
    `EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.roleId
      WHERE ur.userId = u.id AND r.name = 'Pilgrim'
    )`,
    `(
      EXISTS (
        SELECT 1 FROM reservations res
        INNER JOIN mawkibs m ON m.id = res.mawkibId
        WHERE res.pilgrimUserId = u.id AND m.ownerUserId = ?
      )
      OR NOT EXISTS (
        SELECT 1 FROM reservations res2 WHERE res2.pilgrimUserId = u.id
      )
    )`,
  ];
  const params: (string | number)[] = [ownerUserId];

  if (filters.fullName) {
    clauses.push("u.fullName LIKE ?");
    params.push(`%${filters.fullName.trim()}%`);
  }
  if (filters.mobileNumber) {
    clauses.push("u.mobileNumber LIKE ?");
    params.push(`%${formatMobileForLookup(filters.mobileNumber)}%`);
  }
  if (filters.nationalId) {
    clauses.push("u.nationalId LIKE ?");
    params.push(`%${filters.nationalId.trim()}%`);
  }
  if (filters.province) {
    clauses.push("u.province = ?");
    params.push(filters.province);
  }
  if (filters.city) {
    clauses.push("u.city = ?");
    params.push(filters.city);
  }
  if (filters.mawkibId) {
    clauses.push(
      `EXISTS (
        SELECT 1 FROM reservations res
        WHERE res.pilgrimUserId = u.id AND res.mawkibId = ?
      )`,
    );
    params.push(filters.mawkibId);
  }

  const rows = await db.getAllAsync<PilgrimRow>(
    `SELECT DISTINCT u.*
     FROM users u
     WHERE ${clauses.join(" AND ")}
     ORDER BY u.createdAt DESC`,
    params,
  );

  return rows.map(mapPilgrim);
}

export type PilgrimInput = UserProfileInput & {
  fullName: string;
  mobileNumber: string;
};

export async function createPilgrim(input: PilgrimInput): Promise<User> {
  const fullNameError = getFullNameValidationError(input.fullName);
  if (fullNameError) throw new Error(fullNameError);

  const mobileError = getMobileValidationError(input.mobileNumber);
  if (mobileError) throw new Error(mobileError);

  const nationalIdError = getNationalIdValidationError(input.nationalId ?? "");
  if (nationalIdError) throw new Error(nationalIdError);

  const mobile = formatMobileForLookup(input.mobileNumber);
  const db = await getDatabase();

  const existing = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE mobileNumber = ?",
    [mobile],
  );
  if (existing) throw new Error("زائری با این شماره موبایل قبلاً ثبت شده است");

  const passwordHash = await bcrypt.hash(mobile.slice(-6), 10);
  const result = await db.runAsync(
    `INSERT INTO users (
      fullName, mobileNumber, passwordHash, nationalId,
      nationalIdCardImageUrl, imageUrl, gender, birthDate, country,
      passportNumber, province, city, address, carPlate, description,
      whatsapp, telegram, bale, eitaa, email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.fullName.trim(),
      mobile,
      passwordHash,
      input.nationalId?.trim() || null,
      input.nationalIdCardImageUrl?.trim() || null,
      input.imageUrl?.trim() || null,
      input.gender ?? null,
      input.birthDate?.trim() || null,
      input.country?.trim() || "ایران",
      input.passportNumber?.trim() || null,
      input.province?.trim() || null,
      input.city?.trim() || null,
      input.address?.trim() || null,
      input.carPlate?.trim() || null,
      input.description?.trim() || null,
      input.whatsapp?.trim() || null,
      input.telegram?.trim() || null,
      input.bale?.trim() || null,
      input.eitaa?.trim() || null,
      input.email?.trim() || null,
    ],
  );

  await db.runAsync("INSERT INTO user_roles (userId, roleId) VALUES (?, 2)", [
    result.lastInsertRowId,
  ]);

  const pilgrim = await getUserById(result.lastInsertRowId);
  if (!pilgrim) throw new Error("خطا در ثبت زائر");
  return pilgrim;
}

export async function updatePilgrim(
  id: number,
  input: UserProfileInput,
): Promise<User> {
  if (input.fullName) {
    const err = getFullNameValidationError(input.fullName);
    if (err) throw new Error(err);
  }
  if (input.mobileNumber) {
    const err = getMobileValidationError(input.mobileNumber);
    if (err) throw new Error(err);
  }
  if (input.nationalId !== undefined) {
    const err = getNationalIdValidationError(input.nationalId ?? "");
    if (err) throw new Error(err);
  }

  return updateProfile(id, input);
}

export async function deletePilgrim(id: number): Promise<void> {
  const db = await getDatabase();
  const hasReservations = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM reservations WHERE pilgrimUserId = ?",
    [id],
  );
  if ((hasReservations?.count ?? 0) > 0) {
    throw new Error("این زائر رزرو دارد و قابل حذف نیست");
  }
  await db.runAsync("DELETE FROM users WHERE id = ?", [id]);
}

export async function getPilgrimById(id: number): Promise<User | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PilgrimRow>(
    `SELECT * FROM users WHERE id = ?`,
    [id],
  );
  return row ? mapPilgrim(row) : null;
}

export async function getPilgrimByMobile(
  mobileNumber: string,
): Promise<User | null> {
  const mobile = formatMobileForLookup(mobileNumber);
  const db = await getDatabase();
  const row = await db.getFirstAsync<PilgrimRow>(
    `SELECT u.*
     FROM users u
     WHERE u.mobileNumber = ?
       AND EXISTS (
         SELECT 1 FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.roleId
         WHERE ur.userId = u.id AND r.name = 'Pilgrim'
       )`,
    [mobile],
  );
  return row ? mapPilgrim(row) : null;
}
