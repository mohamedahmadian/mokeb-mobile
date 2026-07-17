import bcrypt from "@/src/lib/bcrypt";
import { boolFromDb, getDatabase } from "@/src/db/client";
import { applyUserProfileUpdate } from "@/src/services/auth";
import {
  matchesFullName,
  matchesMobile,
  matchesNationalId,
  matchesPersonOrReservationQuery,
} from "@/src/lib/person-search";
import {
  carPlateFromUser,
  carPlateToProfileFields,
  matchesCarPlate,
  normalizeCarPlateValue,
  resolveProfilePlateFields,
} from "@/src/lib/carPlate";
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
  plate_two_digit: string | null;
  plate_serial: string | null;
  plate_province: string | null;
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
    roles: ["Pilgrim"],
    ownerUserId: row.id,
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

  if (filters.province) {
    clauses.push("u.province = ?");
    params.push(filters.province);
  }
  if (filters.city) {
    clauses.push("u.city = ?");
    params.push(filters.city);
  }
  if (filters.gender) {
    clauses.push("u.gender = ?");
    params.push(filters.gender);
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

  let result = rows.map(mapPilgrim);

  const textQuery =
    filters.query?.trim() ||
    filters.fullName?.trim() ||
    filters.mobileNumber?.trim() ||
    filters.nationalId?.trim() ||
    "";

  if (textQuery) {
    result = result.filter((pilgrim) => {
      if (filters.query?.trim()) {
        return matchesPersonOrReservationQuery(filters.query, {
          fullName: pilgrim.fullName,
          mobile: pilgrim.mobileNumber,
          nationalId: pilgrim.nationalId,
        });
      }
      if (filters.fullName?.trim() && !matchesFullName(pilgrim.fullName, filters.fullName)) {
        return false;
      }
      if (
        filters.mobileNumber?.trim() &&
        !matchesMobile(pilgrim.mobileNumber, filters.mobileNumber)
      ) {
        return false;
      }
      if (
        filters.nationalId?.trim() &&
        !matchesNationalId(pilgrim.nationalId, filters.nationalId)
      ) {
        return false;
      }
      return true;
    });
  }

  result = result.filter((pilgrim) => {
    if (
      filters.country?.trim() &&
      !(pilgrim.country ?? "").includes(filters.country.trim())
    ) {
      return false;
    }
    if (
      filters.plateTwoDigit?.trim() ||
      filters.plateSerial?.trim() ||
      filters.plateProvince?.trim()
    ) {
      if (
        !matchesCarPlate(pilgrim, {
          plateTwoDigit: filters.plateTwoDigit ?? "",
          plateSerial: filters.plateSerial ?? "",
          plateProvince: filters.plateProvince ?? "",
        })
      ) {
        return false;
      }
    } else if (
      filters.carPlate?.trim() &&
      !(pilgrim.carPlate ?? "").includes(filters.carPlate.trim())
    ) {
      return false;
    }
    if (
      filters.passportNumber?.trim() &&
      !(pilgrim.passportNumber ?? "").includes(filters.passportNumber.trim())
    ) {
      return false;
    }
    if (
      filters.description?.trim() &&
      !(pilgrim.description ?? "").includes(filters.description.trim())
    ) {
      return false;
    }
    return true;
  });

  const offset = filters.offset ?? 0;
  if (filters.limit !== undefined) {
    result = result.slice(offset, offset + filters.limit);
  } else if (offset > 0) {
    result = result.slice(offset);
  }

  return result;
}

export async function countPilgrims(ownerUserId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT u.id) as count
     FROM users u
     WHERE EXISTS (
       SELECT 1 FROM user_roles ur
       INNER JOIN roles r ON r.id = ur.roleId
       WHERE ur.userId = u.id AND r.name = 'Pilgrim'
     )
     AND (
       EXISTS (
         SELECT 1 FROM reservations res
         INNER JOIN mawkibs m ON m.id = res.mawkibId
         WHERE res.pilgrimUserId = u.id AND m.ownerUserId = ?
       )
       OR NOT EXISTS (
         SELECT 1 FROM reservations res2 WHERE res2.pilgrimUserId = u.id
       )
     )`,
    [ownerUserId],
  );
  return row?.count ?? 0;
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
  const plateFields = resolveProfilePlateFields(input) ?? carPlateToProfileFields({
    plateTwoDigit: "",
    plateSerial: "",
    plateProvince: "",
  });
  const result = await db.runAsync(
    `INSERT INTO users (
      fullName, mobileNumber, passwordHash, nationalId,
      nationalIdCardImageUrl, imageUrl, gender, birthDate, country,
      passportNumber, province, city, address, carPlate,
      plate_two_digit, plate_serial, plate_province, description,
      whatsapp, telegram, bale, eitaa, email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      plateFields.carPlate,
      plateFields.plateTwoDigit || null,
      plateFields.plateSerial || null,
      plateFields.plateProvince || null,
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

  const pilgrim = await getPilgrimById(result.lastInsertRowId);
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

  await applyUserProfileUpdate(id, input);
  const pilgrim = await getPilgrimById(id);
  if (!pilgrim) throw new Error("زائر یافت نشد");
  return pilgrim;
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
