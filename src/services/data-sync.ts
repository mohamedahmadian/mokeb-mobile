import bcrypt from "@/src/lib/bcrypt";
import { boolFromDb, boolToDb, getDatabase } from "@/src/db/client";
import { formatMobileForLookup } from "@/src/lib/validation";
import type { ManageSection } from "@/src/services/data-management";
import { listPilgrims } from "@/src/services/pilgrims";
import type {
  MealType,
  ReservationEventType,
  ReservationPresenceState,
  ReservationStatus,
  UserGender,
} from "@/src/types";

export const DATA_SYNC_FORMAT = "mokeb-data-export" as const;
export const DATA_SYNC_VERSION = 1 as const;

export type DataSyncScope = "all" | "pilgrim";

export type ExportedPilgrim = {
  mobileNumber: string;
  fullName: string;
  nationalId?: string | null;
  nationalIdCardImageUrl?: string | null;
  imageUrl?: string | null;
  gender?: UserGender | null;
  birthDate?: string | null;
  country?: string | null;
  passportNumber?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  carPlate?: string | null;
  description?: string | null;
  whatsapp?: string | null;
  telegram?: string | null;
  bale?: string | null;
  eitaa?: string | null;
  email?: string | null;
  createdAt?: string;
};

export type ExportedMawkibRef = {
  name: string;
  phoneNumber: string;
};

export type ExportedReservation = {
  trackingCode: string;
  mawkib: ExportedMawkibRef;
  pilgrim: ExportedPilgrim;
  reservationDate: string;
  reservationEndDate: string;
  plannedCheckInTime?: string | null;
  plannedCheckOutTime?: string | null;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  maleGuestCount: number;
  femaleGuestCount: number;
  pilgrimMobile: string;
  companions?: string | null;
  description?: string | null;
  travelOrigin?: string | null;
  cancellationNote?: string | null;
  status: ReservationStatus;
  presenceState: ReservationPresenceState;
  lastStatusUpdatedAt?: string | null;
  createdAt?: string;
};

export type ExportedAttendanceEvent = {
  eventType: ReservationEventType;
  createdAt: string;
  description?: string | null;
};

export type ExportedAttendance = {
  trackingCode: string;
  presenceState: ReservationPresenceState;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  status: ReservationStatus;
  lastStatusUpdatedAt?: string | null;
  events: ExportedAttendanceEvent[];
};

export type ExportedMealPlan = {
  trackingCode: string;
  date: string;
  mealType: MealType;
  isRequired: boolean;
  isServed: boolean;
  servedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DataSyncPayload =
  | {
      format: typeof DATA_SYNC_FORMAT;
      version: typeof DATA_SYNC_VERSION;
      section: "pilgrims";
      scope: DataSyncScope;
      exportedAt: string;
      sourceOwnerMobile?: string;
      pilgrimMobile?: string;
      items: ExportedPilgrim[];
    }
  | {
      format: typeof DATA_SYNC_FORMAT;
      version: typeof DATA_SYNC_VERSION;
      section: "reservations";
      scope: DataSyncScope;
      exportedAt: string;
      sourceOwnerMobile?: string;
      pilgrimMobile?: string;
      items: ExportedReservation[];
    }
  | {
      format: typeof DATA_SYNC_FORMAT;
      version: typeof DATA_SYNC_VERSION;
      section: "attendance";
      scope: DataSyncScope;
      exportedAt: string;
      sourceOwnerMobile?: string;
      pilgrimMobile?: string;
      items: ExportedAttendance[];
    }
  | {
      format: typeof DATA_SYNC_FORMAT;
      version: typeof DATA_SYNC_VERSION;
      section: "meals";
      scope: DataSyncScope;
      exportedAt: string;
      sourceOwnerMobile?: string;
      pilgrimMobile?: string;
      items: ExportedMealPlan[];
    };

export type ImportPreview = {
  valid: boolean;
  error?: string;
  section?: ManageSection;
  scope?: DataSyncScope;
  exportedAt?: string;
  total: number;
  creates: number;
  updates: number;
  skipped: number;
  skipReasons: { reason: string; count: number }[];
  warnings: string[];
};

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

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
  createdAt: string;
};

function mapPilgrimExport(row: PilgrimRow): ExportedPilgrim {
  return {
    mobileNumber: row.mobileNumber,
    fullName: row.fullName,
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
    createdAt: row.createdAt,
  };
}

function pilgrimFilterClause(
  scope: DataSyncScope,
  pilgrimUserId: number | null,
): { sql: string; params: number[] } {
  if (scope === "pilgrim" && pilgrimUserId) {
    return { sql: "AND r.pilgrimUserId = ?", params: [pilgrimUserId] };
  }
  return { sql: "", params: [] };
}

export async function exportSectionData(
  ownerUserId: number,
  section: ManageSection,
  scope: DataSyncScope,
  options: {
    ownerMobile?: string;
    pilgrimUserId?: number | null;
    pilgrimMobile?: string;
  } = {},
): Promise<DataSyncPayload> {
  const exportedAt = new Date().toISOString();
  const baseMeta = {
    format: DATA_SYNC_FORMAT,
    version: DATA_SYNC_VERSION,
    scope,
    exportedAt,
    sourceOwnerMobile: options.ownerMobile,
    pilgrimMobile: scope === "pilgrim" ? options.pilgrimMobile : undefined,
  } as const;

  if (section === "pilgrims") {
    const pilgrims =
      scope === "pilgrim" && options.pilgrimUserId
        ? await listPilgrims(ownerUserId).then((rows) =>
            rows.filter((p) => p.id === options.pilgrimUserId),
          )
        : await listPilgrims(ownerUserId);

    return {
      ...baseMeta,
      section: "pilgrims",
      items: pilgrims.map((p) => ({
        mobileNumber: p.mobileNumber,
        fullName: p.fullName,
        nationalId: p.nationalId,
        nationalIdCardImageUrl: p.nationalIdCardImageUrl,
        imageUrl: p.imageUrl,
        gender: p.gender,
        birthDate: p.birthDate,
        country: p.country,
        passportNumber: p.passportNumber,
        province: p.province,
        city: p.city,
        address: p.address,
        carPlate: p.carPlate,
        description: p.description,
        whatsapp: p.whatsapp,
        telegram: p.telegram,
        bale: p.bale,
        eitaa: p.eitaa,
        email: p.email,
        createdAt: p.createdAt,
      })),
    };
  }

  const db = await getDatabase();
  const pilgrimFilter = pilgrimFilterClause(scope, options.pilgrimUserId ?? null);

  if (section === "reservations") {
    const rows = await db.getAllAsync<
      PilgrimRow & {
        trackingCode: string;
        mawkibName: string;
        mawkibPhone: string;
        reservationDate: string;
        reservationEndDate: string;
        plannedCheckInTime: string | null;
        plannedCheckOutTime: string | null;
        actualCheckInAt: string | null;
        actualCheckOutAt: string | null;
        maleGuestCount: number;
        femaleGuestCount: number;
        pilgrimMobile: string;
        companions: string | null;
        description: string | null;
        travelOrigin: string | null;
        cancellationNote: string | null;
        status: ReservationStatus;
        presenceState: ReservationPresenceState;
        lastStatusUpdatedAt: string | null;
        reservationCreatedAt: string;
      }
    >(
      `SELECT r.trackingCode, r.reservationDate, r.reservationEndDate,
              r.plannedCheckInTime, r.plannedCheckOutTime,
              r.actualCheckInAt, r.actualCheckOutAt,
              r.maleGuestCount, r.femaleGuestCount, r.pilgrimMobile,
              r.companions, r.description, r.travelOrigin, r.cancellationNote,
              r.status, r.presenceState, r.lastStatusUpdatedAt,
              r.createdAt as reservationCreatedAt,
              m.name as mawkibName, m.phoneNumber as mawkibPhone,
              u.*
       FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       INNER JOIN users u ON u.id = r.pilgrimUserId
       WHERE m.ownerUserId = ? ${pilgrimFilter.sql}
       ORDER BY r.createdAt DESC`,
      [ownerUserId, ...pilgrimFilter.params],
    );

    return {
      ...baseMeta,
      section: "reservations",
      items: rows.map((row) => ({
        trackingCode: row.trackingCode,
        mawkib: { name: row.mawkibName, phoneNumber: row.mawkibPhone },
        pilgrim: mapPilgrimExport(row),
        reservationDate: row.reservationDate,
        reservationEndDate: row.reservationEndDate,
        plannedCheckInTime: row.plannedCheckInTime,
        plannedCheckOutTime: row.plannedCheckOutTime,
        actualCheckInAt: row.actualCheckInAt,
        actualCheckOutAt: row.actualCheckOutAt,
        maleGuestCount: row.maleGuestCount,
        femaleGuestCount: row.femaleGuestCount,
        pilgrimMobile: row.pilgrimMobile,
        companions: row.companions,
        description: row.description,
        travelOrigin: row.travelOrigin,
        cancellationNote: row.cancellationNote,
        status: row.status,
        presenceState: row.presenceState,
        lastStatusUpdatedAt: row.lastStatusUpdatedAt,
        createdAt: row.reservationCreatedAt,
      })),
    };
  }

  if (section === "attendance") {
    const reservations = await db.getAllAsync<{
      trackingCode: string;
      presenceState: ReservationPresenceState;
      actualCheckInAt: string | null;
      actualCheckOutAt: string | null;
      status: ReservationStatus;
      lastStatusUpdatedAt: string | null;
      reservationId: number;
    }>(
      `SELECT r.id as reservationId, r.trackingCode, r.presenceState,
              r.actualCheckInAt, r.actualCheckOutAt, r.status, r.lastStatusUpdatedAt
       FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ? ${pilgrimFilter.sql}
       ORDER BY r.createdAt DESC`,
      [ownerUserId, ...pilgrimFilter.params],
    );

    const items: ExportedAttendance[] = [];
    for (const reservation of reservations) {
      const events = await db.getAllAsync<ExportedAttendanceEvent>(
        `SELECT eventType, createdAt, description
         FROM reservation_events
         WHERE reservationId = ?
         ORDER BY createdAt ASC`,
        [reservation.reservationId],
      );
      items.push({
        trackingCode: reservation.trackingCode,
        presenceState: reservation.presenceState,
        actualCheckInAt: reservation.actualCheckInAt,
        actualCheckOutAt: reservation.actualCheckOutAt,
        status: reservation.status,
        lastStatusUpdatedAt: reservation.lastStatusUpdatedAt,
        events,
      });
    }

    return { ...baseMeta, section: "attendance", items };
  }

  const mealRows = await db.getAllAsync<{
    trackingCode: string;
    date: string;
    mealType: MealType;
    isRequired: number;
    isServed: number;
    servedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>(
    `SELECT r.trackingCode, mp.date, mp.mealType, mp.isRequired, mp.isServed,
            mp.servedAt, mp.createdAt, mp.updatedAt
     FROM meal_plans mp
     INNER JOIN reservations r ON r.id = mp.reservationId
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE m.ownerUserId = ? ${pilgrimFilter.sql}
     ORDER BY r.trackingCode, mp.date, mp.mealType`,
    [ownerUserId, ...pilgrimFilter.params],
  );

  return {
    ...baseMeta,
    section: "meals",
    items: mealRows.map((row) => ({
      trackingCode: row.trackingCode,
      date: row.date,
      mealType: row.mealType,
      isRequired: boolFromDb(row.isRequired),
      isServed: boolFromDb(row.isServed),
      servedAt: row.servedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
  };
}

export function parseDataSyncPayload(raw: string): DataSyncPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("فایل انتخاب‌شده JSON معتبر نیست");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { format?: string }).format !== DATA_SYNC_FORMAT
  ) {
    throw new Error("این فایل از نوع خروجی موکب‌یار نیست");
  }

  const payload = parsed as DataSyncPayload;
  if (payload.version !== DATA_SYNC_VERSION) {
    throw new Error(
      `نسخه فایل (${payload.version}) با برنامه (${DATA_SYNC_VERSION}) سازگار نیست`,
    );
  }

  if (!Array.isArray(payload.items)) {
    throw new Error("ساختار فایل نامعتبر است");
  }

  return payload;
}

function incrementSkip(
  map: Map<string, number>,
  reason: string,
  count = 1,
) {
  map.set(reason, (map.get(reason) ?? 0) + count);
}

async function resolveMawkibId(
  ownerUserId: number,
  ref: ExportedMawkibRef,
): Promise<number | null> {
  const db = await getDatabase();
  const byNameAndPhone = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM mawkibs
     WHERE ownerUserId = ? AND name = ? AND phoneNumber = ?
     LIMIT 1`,
    [ownerUserId, ref.name.trim(), ref.phoneNumber.trim()],
  );
  if (byNameAndPhone) return byNameAndPhone.id;

  const byName = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM mawkibs WHERE ownerUserId = ? AND name = ?`,
    [ownerUserId, ref.name.trim()],
  );
  if (byName.length === 1) return byName[0].id;
  return null;
}

async function isStaffUser(userId: number): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT ur.userId as id FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.roleId
     WHERE ur.userId = ? AND r.name IN ('MawkibOwner', 'MawkibServant')`,
    [userId],
  );
  return !!row;
}

async function findPilgrimByMobile(
  mobile: string,
): Promise<{ id: number } | null> {
  const db = await getDatabase();
  return db.getFirstAsync<{ id: number }>(
    "SELECT id FROM users WHERE mobileNumber = ?",
    [formatMobileForLookup(mobile)],
  );
}

async function ensurePilgrimRole(userId: number) {
  const db = await getDatabase();
  const hasRole = await db.getFirstAsync<{ userId: number }>(
    `SELECT ur.userId FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.roleId
     WHERE ur.userId = ? AND r.name = 'Pilgrim'`,
    [userId],
  );
  if (!hasRole) {
    await db.runAsync("INSERT INTO user_roles (userId, roleId) VALUES (?, 2)", [
      userId,
    ]);
  }
}

type UpsertPilgrimResult = "created" | "updated" | "skipped";

async function upsertPilgrim(
  pilgrim: ExportedPilgrim,
): Promise<{ result: UpsertPilgrimResult; userId?: number; skipReason?: string }> {
  const mobile = formatMobileForLookup(pilgrim.mobileNumber);
  if (!mobile) {
    return { result: "skipped", skipReason: "شماره موبایل نامعتبر" };
  }

  const db = await getDatabase();
  const existing = await findPilgrimByMobile(mobile);

  if (existing) {
    if (await isStaffUser(existing.id)) {
      return {
        result: "skipped",
        skipReason: "شماره موبایل متعلق به کاربر مدیریتی است",
      };
    }

    await db.runAsync(
      `UPDATE users SET
        fullName = ?, nationalId = ?, nationalIdCardImageUrl = ?, imageUrl = ?,
        gender = ?, birthDate = ?, country = ?, passportNumber = ?,
        province = ?, city = ?, address = ?, carPlate = ?, description = ?,
        whatsapp = ?, telegram = ?, bale = ?, eitaa = ?, email = ?
       WHERE id = ?`,
      [
        pilgrim.fullName.trim(),
        pilgrim.nationalId?.trim() || null,
        pilgrim.nationalIdCardImageUrl?.trim() || null,
        pilgrim.imageUrl?.trim() || null,
        pilgrim.gender ?? null,
        pilgrim.birthDate?.trim() || null,
        pilgrim.country?.trim() || "ایران",
        pilgrim.passportNumber?.trim() || null,
        pilgrim.province?.trim() || null,
        pilgrim.city?.trim() || null,
        pilgrim.address?.trim() || null,
        pilgrim.carPlate?.trim() || null,
        pilgrim.description?.trim() || null,
        pilgrim.whatsapp?.trim() || null,
        pilgrim.telegram?.trim() || null,
        pilgrim.bale?.trim() || null,
        pilgrim.eitaa?.trim() || null,
        pilgrim.email?.trim() || null,
        existing.id,
      ],
    );
    await ensurePilgrimRole(existing.id);
    return { result: "updated", userId: existing.id };
  }

  const passwordHash = await bcrypt.hash(mobile.slice(-6), 10);
  const insert = await db.runAsync(
    `INSERT INTO users (
      fullName, mobileNumber, passwordHash, nationalId,
      nationalIdCardImageUrl, imageUrl, gender, birthDate, country,
      passportNumber, province, city, address, carPlate, description,
      whatsapp, telegram, bale, eitaa, email, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    [
      pilgrim.fullName.trim(),
      mobile,
      passwordHash,
      pilgrim.nationalId?.trim() || null,
      pilgrim.nationalIdCardImageUrl?.trim() || null,
      pilgrim.imageUrl?.trim() || null,
      pilgrim.gender ?? null,
      pilgrim.birthDate?.trim() || null,
      pilgrim.country?.trim() || "ایران",
      pilgrim.passportNumber?.trim() || null,
      pilgrim.province?.trim() || null,
      pilgrim.city?.trim() || null,
      pilgrim.address?.trim() || null,
      pilgrim.carPlate?.trim() || null,
      pilgrim.description?.trim() || null,
      pilgrim.whatsapp?.trim() || null,
      pilgrim.telegram?.trim() || null,
      pilgrim.bale?.trim() || null,
      pilgrim.eitaa?.trim() || null,
      pilgrim.email?.trim() || null,
      pilgrim.createdAt ?? null,
    ],
  );
  await db.runAsync("INSERT INTO user_roles (userId, roleId) VALUES (?, 2)", [
    insert.lastInsertRowId,
  ]);
  return { result: "created", userId: insert.lastInsertRowId };
}

async function findOwnerReservationByTrackingCode(
  ownerUserId: number,
  trackingCode: string,
): Promise<{ id: number } | null> {
  const db = await getDatabase();
  return db.getFirstAsync<{ id: number }>(
    `SELECT r.id FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE m.ownerUserId = ? AND r.trackingCode = ?`,
    [ownerUserId, trackingCode],
  );
}

async function findAnyReservationByTrackingCode(
  trackingCode: string,
): Promise<{ id: number; ownerUserId: number } | null> {
  const db = await getDatabase();
  return db.getFirstAsync<{ id: number; ownerUserId: number }>(
    `SELECT r.id, m.ownerUserId
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE r.trackingCode = ?`,
    [trackingCode],
  );
}

type UpsertReservationResult = "created" | "updated" | "skipped";

async function upsertReservation(
  ownerUserId: number,
  item: ExportedReservation,
): Promise<{ result: UpsertReservationResult; skipReason?: string }> {
  const mawkibId = await resolveMawkibId(ownerUserId, item.mawkib);
  if (!mawkibId) {
    return { result: "skipped", skipReason: "موکب مقصد یافت نشد" };
  }

  const pilgrimUpsert = await upsertPilgrim(item.pilgrim);
  if (pilgrimUpsert.result === "skipped" || !pilgrimUpsert.userId) {
    return {
      result: "skipped",
      skipReason: pilgrimUpsert.skipReason ?? "زائر قابل ثبت نیست",
    };
  }

  const db = await getDatabase();
  const mobile = formatMobileForLookup(item.pilgrimMobile || item.pilgrim.mobileNumber);
  const existingAny = await findAnyReservationByTrackingCode(item.trackingCode);
  const existingOwner = await findOwnerReservationByTrackingCode(
    ownerUserId,
    item.trackingCode,
  );

  if (existingAny && existingAny.ownerUserId !== ownerUserId) {
    return {
      result: "skipped",
      skipReason: "کد رزرو در سیستم دیگری ثبت شده است",
    };
  }

  if (existingOwner) {
    await db.runAsync(
      `UPDATE reservations SET
        mawkibId = ?, pilgrimUserId = ?, pilgrimMobile = ?,
        reservationDate = ?, reservationEndDate = ?,
        plannedCheckInTime = ?, plannedCheckOutTime = ?,
        actualCheckInAt = ?, actualCheckOutAt = ?,
        maleGuestCount = ?, femaleGuestCount = ?,
        companions = ?, description = ?, travelOrigin = ?,
        cancellationNote = ?, status = ?, presenceState = ?,
        lastStatusUpdatedByUserId = ?, lastStatusUpdatedAt = COALESCE(?, datetime('now'))
       WHERE id = ?`,
      [
        mawkibId,
        pilgrimUpsert.userId,
        mobile,
        item.reservationDate,
        item.reservationEndDate,
        item.plannedCheckInTime ?? null,
        item.plannedCheckOutTime ?? null,
        item.actualCheckInAt ?? null,
        item.actualCheckOutAt ?? null,
        item.maleGuestCount,
        item.femaleGuestCount,
        item.companions?.trim() || null,
        item.description?.trim() || null,
        item.travelOrigin?.trim() || null,
        item.cancellationNote?.trim() || null,
        item.status,
        item.presenceState,
        ownerUserId,
        item.lastStatusUpdatedAt ?? null,
        existingOwner.id,
      ],
    );
    return { result: "updated" };
  }

  await db.runAsync(
    `INSERT INTO reservations (
      mawkibId, pilgrimUserId, reservedByUserId,
      reservationDate, reservationEndDate,
      plannedCheckInTime, plannedCheckOutTime,
      actualCheckInAt, actualCheckOutAt,
      maleGuestCount, femaleGuestCount,
      trackingCode, pilgrimMobile,
      companions, description, travelOrigin, cancellationNote,
      status, presenceState,
      lastStatusUpdatedByUserId, lastStatusUpdatedAt, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
    [
      mawkibId,
      pilgrimUpsert.userId,
      ownerUserId,
      item.reservationDate,
      item.reservationEndDate,
      item.plannedCheckInTime ?? null,
      item.plannedCheckOutTime ?? null,
      item.actualCheckInAt ?? null,
      item.actualCheckOutAt ?? null,
      item.maleGuestCount,
      item.femaleGuestCount,
      item.trackingCode,
      mobile,
      item.companions?.trim() || null,
      item.description?.trim() || null,
      item.travelOrigin?.trim() || null,
      item.cancellationNote?.trim() || null,
      item.status,
      item.presenceState,
      ownerUserId,
      item.lastStatusUpdatedAt ?? null,
      item.createdAt ?? null,
    ],
  );
  return { result: "created" };
}

async function analyzeImportItem(
  ownerUserId: number,
  payload: DataSyncPayload,
  item: DataSyncPayload["items"][number],
): Promise<"create" | "update" | "skip"> {
  if (payload.section === "pilgrims") {
    const pilgrim = item as ExportedPilgrim;
    const existing = await findPilgrimByMobile(pilgrim.mobileNumber);
    if (!existing) return "create";
    if (await isStaffUser(existing.id)) return "skip";
    return "update";
  }

  if (payload.section === "reservations") {
    const reservation = item as ExportedReservation;
    const mawkibId = await resolveMawkibId(ownerUserId, reservation.mawkib);
    if (!mawkibId) return "skip";
    const pilgrimExisting = await findPilgrimByMobile(
      reservation.pilgrim.mobileNumber,
    );
    if (pilgrimExisting && (await isStaffUser(pilgrimExisting.id))) {
      return "skip";
    }
    const existingAny = await findAnyReservationByTrackingCode(
      reservation.trackingCode,
    );
    if (existingAny && existingAny.ownerUserId !== ownerUserId) return "skip";
    const existingOwner = await findOwnerReservationByTrackingCode(
      ownerUserId,
      reservation.trackingCode,
    );
    return existingOwner ? "update" : "create";
  }

  if (payload.section === "attendance") {
    const attendance = item as ExportedAttendance;
    const reservation = await findOwnerReservationByTrackingCode(
      ownerUserId,
      attendance.trackingCode,
    );
    return reservation ? "update" : "skip";
  }

  const meal = item as ExportedMealPlan;
  const reservation = await findOwnerReservationByTrackingCode(
    ownerUserId,
    meal.trackingCode,
  );
  if (!reservation) return "skip";

  const db = await getDatabase();
  const existingMeal = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM meal_plans
     WHERE reservationId = ? AND date = ? AND mealType = ?`,
    [reservation.id, meal.date, meal.mealType],
  );
  return existingMeal ? "update" : "create";
}

export async function previewImport(
  ownerUserId: number,
  payload: DataSyncPayload,
  expectedSection?: ManageSection,
): Promise<ImportPreview> {
  if (expectedSection && payload.section !== expectedSection) {
    return {
      valid: false,
      error: `این فایل مربوط به بخش «${sectionLabel(payload.section)}» است، نه «${sectionLabel(expectedSection)}»`,
      total: payload.items.length,
      creates: 0,
      updates: 0,
      skipped: payload.items.length,
      skipReasons: [],
      warnings: [],
    };
  }

  let creates = 0;
  let updates = 0;
  let skipped = 0;
  const skipReasons = new Map<string, number>();
  const warnings: string[] = [];

  for (const item of payload.items) {
    const action = await analyzeImportItem(ownerUserId, payload, item);
    if (action === "create") creates += 1;
    else if (action === "update") updates += 1;
    else {
      skipped += 1;
      if (payload.section === "reservations") {
        const reservation = item as ExportedReservation;
        const mawkibId = await resolveMawkibId(ownerUserId, reservation.mawkib);
        if (!mawkibId) incrementSkip(skipReasons, "موکب مقصد یافت نشد");
        else {
          const pilgrimExisting = await findPilgrimByMobile(
            reservation.pilgrim.mobileNumber,
          );
          if (pilgrimExisting && (await isStaffUser(pilgrimExisting.id))) {
            incrementSkip(
              skipReasons,
              "شماره موبایل متعلق به کاربر مدیریتی است",
            );
          } else {
            const existingAny = await findAnyReservationByTrackingCode(
              reservation.trackingCode,
            );
            if (existingAny && existingAny.ownerUserId !== ownerUserId) {
              incrementSkip(
                skipReasons,
                "کد رزرو در سیستم دیگری ثبت شده است",
              );
            }
          }
        }
      } else if (payload.section === "attendance") {
        incrementSkip(skipReasons, "رزرو مرتبط یافت نشد");
      } else if (payload.section === "meals") {
        incrementSkip(skipReasons, "رزرو مرتبط یافت نشد");
      } else {
        const pilgrim = item as ExportedPilgrim;
        const existing = await findPilgrimByMobile(pilgrim.mobileNumber);
        if (existing && (await isStaffUser(existing.id))) {
          incrementSkip(
            skipReasons,
            "شماره موبایل متعلق به کاربر مدیریتی است",
          );
        } else {
          incrementSkip(skipReasons, "رد شد");
        }
      }
    }
  }

  if (payload.scope === "pilgrim" && payload.pilgrimMobile) {
    warnings.push(
      `این فایل فقط داده‌های زائر ${payload.pilgrimMobile} را شامل می‌شود.`,
    );
  }

  if (payload.sourceOwnerMobile) {
    warnings.push(
      `منبع خروجی: ${payload.sourceOwnerMobile} — در ${formatExportDate(payload.exportedAt)}`,
    );
  }

  return {
    valid: true,
    section: payload.section,
    scope: payload.scope,
    exportedAt: payload.exportedAt,
    total: payload.items.length,
    creates,
    updates,
    skipped,
    skipReasons: Array.from(skipReasons.entries()).map(([reason, count]) => ({
      reason,
      count,
    })),
    warnings,
  };
}

function formatExportDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fa-IR");
  } catch {
    return iso;
  }
}

function sectionLabel(section: ManageSection) {
  switch (section) {
    case "pilgrims":
      return "زائرین";
    case "reservations":
      return "رزروها";
    case "attendance":
      return "ورود و خروج";
    case "meals":
      return "وعده غذایی";
  }
}

async function importAttendanceItem(
  ownerUserId: number,
  item: ExportedAttendance,
): Promise<{ result: UpsertReservationResult; skipReason?: string }> {
  const reservation = await findOwnerReservationByTrackingCode(
    ownerUserId,
    item.trackingCode,
  );
  if (!reservation) {
    return { result: "skipped", skipReason: "رزرو مرتبط یافت نشد" };
  }

  const db = await getDatabase();

  for (const event of item.events) {
    const existingEvent = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM reservation_events
       WHERE reservationId = ? AND eventType = ? AND createdAt = ?`,
      [reservation.id, event.eventType, event.createdAt],
    );
    if (!existingEvent) {
      await db.runAsync(
        `INSERT INTO reservation_events (
          reservationId, eventType, createdByUserId, description, createdAt
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          reservation.id,
          event.eventType,
          ownerUserId,
          event.description?.trim() || null,
          event.createdAt,
        ],
      );
    }
  }

  await db.runAsync(
    `UPDATE reservations SET
      presenceState = ?,
      actualCheckInAt = ?,
      actualCheckOutAt = ?,
      status = ?,
      lastStatusUpdatedByUserId = ?,
      lastStatusUpdatedAt = COALESCE(?, datetime('now'))
     WHERE id = ?`,
    [
      item.presenceState,
      item.actualCheckInAt ?? null,
      item.actualCheckOutAt ?? null,
      item.status,
      ownerUserId,
      item.lastStatusUpdatedAt ?? null,
      reservation.id,
    ],
  );

  return { result: "updated" };
}

async function importMealItem(
  ownerUserId: number,
  item: ExportedMealPlan,
): Promise<{ result: "created" | "updated" | "skipped"; skipReason?: string }> {
  const reservation = await findOwnerReservationByTrackingCode(
    ownerUserId,
    item.trackingCode,
  );
  if (!reservation) {
    return { result: "skipped", skipReason: "رزرو مرتبط یافت نشد" };
  }

  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: number }>(
    `SELECT id FROM meal_plans
     WHERE reservationId = ? AND date = ? AND mealType = ?`,
    [reservation.id, item.date, item.mealType],
  );

  if (existing) {
    await db.runAsync(
      `UPDATE meal_plans SET
        isRequired = ?, isServed = ?, servedAt = ?,
        updatedAt = COALESCE(?, datetime('now'))
       WHERE id = ?`,
      [
        boolToDb(item.isRequired),
        boolToDb(item.isServed),
        item.servedAt ?? null,
        item.updatedAt ?? null,
        existing.id,
      ],
    );
    return { result: "updated" };
  }

  await db.runAsync(
    `INSERT INTO meal_plans (
      reservationId, date, mealType, isRequired, isServed, servedAt, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`,
    [
      reservation.id,
      item.date,
      item.mealType,
      boolToDb(item.isRequired),
      boolToDb(item.isServed),
      item.servedAt ?? null,
      item.createdAt ?? null,
      item.updatedAt ?? null,
    ],
  );
  return { result: "created" };
}

export async function importSectionData(
  ownerUserId: number,
  payload: DataSyncPayload,
  expectedSection?: ManageSection,
): Promise<ImportResult> {
  const preview = await previewImport(ownerUserId, payload, expectedSection);
  if (!preview.valid) {
    throw new Error(preview.error ?? "فایل قابل واردسازی نیست");
  }

  const db = await getDatabase();
  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  await db.withTransactionAsync(async () => {
    for (const item of payload.items) {
      try {
        if (payload.section === "pilgrims") {
          const upsert = await upsertPilgrim(item as ExportedPilgrim);
          if (upsert.result === "created") result.created += 1;
          else if (upsert.result === "updated") result.updated += 1;
          else {
            result.skipped += 1;
            if (upsert.skipReason) result.errors.push(upsert.skipReason);
          }
        } else if (payload.section === "reservations") {
          const upsert = await upsertReservation(
            ownerUserId,
            item as ExportedReservation,
          );
          if (upsert.result === "created") result.created += 1;
          else if (upsert.result === "updated") result.updated += 1;
          else {
            result.skipped += 1;
            if (upsert.skipReason) {
              result.errors.push(
                `${(item as ExportedReservation).trackingCode}: ${upsert.skipReason}`,
              );
            }
          }
        } else if (payload.section === "attendance") {
          const upsert = await importAttendanceItem(
            ownerUserId,
            item as ExportedAttendance,
          );
          if (upsert.result === "updated") result.updated += 1;
          else {
            result.skipped += 1;
            if (upsert.skipReason) {
              result.errors.push(
                `${(item as ExportedAttendance).trackingCode}: ${upsert.skipReason}`,
              );
            }
          }
        } else {
          const upsert = await importMealItem(
            ownerUserId,
            item as ExportedMealPlan,
          );
          if (upsert.result === "created") result.created += 1;
          else if (upsert.result === "updated") result.updated += 1;
          else {
            result.skipped += 1;
            if (upsert.skipReason) {
              result.errors.push(
                `${(item as ExportedMealPlan).trackingCode} ${(item as ExportedMealPlan).date}: ${upsert.skipReason}`,
              );
            }
          }
        }
      } catch (error) {
        result.skipped += 1;
        result.errors.push(
          error instanceof Error ? error.message : "خطای ناشناخته در واردسازی",
        );
      }
    }
  });

  return result;
}

export function buildExportFilename(
  section: ManageSection,
  scope: DataSyncScope,
): string {
  const date = new Date().toISOString().slice(0, 10);
  const scopePart = scope === "pilgrim" ? "pilgrim" : "all";
  return `mokeb-${section}-${scopePart}-${date}.json`;
}
