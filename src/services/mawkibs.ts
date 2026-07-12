import { boolFromDb, boolToDb, getDatabase } from "@/src/db/client";
import type {
  Mawkib,
  MawkibCity,
  MawkibCountry,
  MawkibListFilters,
  MawkibStatus,
} from "@/src/types";

type MawkibRow = {
  id: number;
  name: string;
  address: string;
  neshanAddressUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string;
  description: string | null;
  facilities: string | null;
  services: string | null;
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  maleCapacity: number;
  femaleCapacity: number;
  imageUrl: string | null;
  distanceToShrine: string | null;
  distanceToBusStation: string | null;
  distanceToMetro: string | null;
  lunchReception: number;
  breakfastReception: number;
  dinnerReception: number;
  bathroom: number;
  laundry: number;
  parking: number;
  internet: number;
  familyFriendly: number;
  elevator: number;
  stairs: number;
  maxReservationDays: number;
  defaultReservationDays: number;
  country: "Iran" | "Iraq";
  mawkibCity: Mawkib["mawkibCity"];
  rules: string | null;
  telegramChannel: string | null;
  whatsapp: string | null;
  bale: string | null;
  eitaa: string | null;
  websiteUrl: string | null;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  onlineReservationEnabled: number;
  autoApprovePilgrimReservations: number;
  recordCheckInOnReservationConfirm: number;
  skipCapacityCheckEnabled: number;
  mealPlanManagementEnabled: number;
  ownerUserId: number;
  status: MawkibStatus;
  createdAt: string;
};

export type MawkibInput = {
  name: string;
  address: string;
  neshanAddressUrl?: string;
  latitude?: number | null;
  longitude?: number | null;
  phoneNumber: string;
  description?: string;
  facilities?: string;
  services?: string;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
  maleCapacity: number;
  femaleCapacity: number;
  imageUrl?: string;
  distanceToShrine?: string;
  distanceToBusStation?: string;
  distanceToMetro?: string;
  lunchReception: boolean;
  breakfastReception: boolean;
  dinnerReception: boolean;
  bathroom: boolean;
  laundry: boolean;
  parking: boolean;
  internet: boolean;
  familyFriendly: boolean;
  elevator: boolean;
  stairs: boolean;
  maxReservationDays: number;
  defaultReservationDays: number;
  country: MawkibCountry;
  mawkibCity?: MawkibCity | null;
  rules?: string;
  telegramChannel?: string;
  whatsapp?: string;
  bale?: string;
  eitaa?: string;
  websiteUrl?: string;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  onlineReservationEnabled: boolean;
  autoApprovePilgrimReservations: boolean;
  recordCheckInOnReservationConfirm: boolean;
  skipCapacityCheckEnabled: boolean;
  mealPlanManagementEnabled: boolean;
};

function optionalText(value?: string): string | null {
  return value?.trim() || null;
}

function validateMawkibInput(input: MawkibInput) {
  if (!input.name.trim()) throw new Error("نام موکب را وارد کنید");
  if (!input.address.trim()) throw new Error("آدرس موکب را وارد کنید");
  if (!input.phoneNumber.trim()) throw new Error("شماره تماس را وارد کنید");
  if (input.maleCapacity < 0 || input.femaleCapacity < 0) {
    throw new Error("ظرفیت نمی‌تواند منفی باشد");
  }
  if (input.maxReservationDays < 1 || input.defaultReservationDays < 1) {
    throw new Error("تعداد روزهای رزرو باید حداقل یک روز باشد");
  }
  if (input.defaultReservationDays > input.maxReservationDays) {
    throw new Error("مدت پیش‌فرض رزرو نمی‌تواند از حداکثر روزها بیشتر باشد");
  }
  if (
    input.serviceStartDate &&
    input.serviceEndDate &&
    input.serviceEndDate < input.serviceStartDate
  ) {
    throw new Error("تاریخ پایان خدمت نمی‌تواند قبل از تاریخ شروع باشد");
  }
}

function mawkibInputValues(input: MawkibInput) {
  return [
    input.name.trim(),
    input.address.trim(),
    optionalText(input.neshanAddressUrl),
    input.latitude ?? null,
    input.longitude ?? null,
    input.phoneNumber.trim(),
    optionalText(input.description),
    optionalText(input.facilities),
    optionalText(input.services),
    input.serviceStartDate || null,
    input.serviceEndDate || null,
    input.maleCapacity,
    input.femaleCapacity,
    optionalText(input.imageUrl),
    optionalText(input.distanceToShrine),
    optionalText(input.distanceToBusStation),
    optionalText(input.distanceToMetro),
    boolToDb(input.lunchReception),
    boolToDb(input.breakfastReception),
    boolToDb(input.dinnerReception),
    boolToDb(input.bathroom),
    boolToDb(input.laundry),
    boolToDb(input.parking),
    boolToDb(input.internet),
    boolToDb(input.familyFriendly),
    boolToDb(input.elevator),
    boolToDb(input.stairs),
    input.maxReservationDays,
    input.defaultReservationDays,
    input.country,
    input.mawkibCity ?? null,
    optionalText(input.rules),
    optionalText(input.telegramChannel),
    optionalText(input.whatsapp),
    optionalText(input.bale),
    optionalText(input.eitaa),
    optionalText(input.websiteUrl),
    input.defaultCheckInTime.trim() || "14:00",
    input.defaultCheckOutTime.trim() || "11:00",
    boolToDb(input.onlineReservationEnabled),
    boolToDb(input.autoApprovePilgrimReservations),
    boolToDb(input.recordCheckInOnReservationConfirm),
    boolToDb(input.skipCapacityCheckEnabled),
    boolToDb(input.mealPlanManagementEnabled),
  ];
}

const EDITABLE_MAWKIB_COLUMNS = [
  "name",
  "address",
  "neshanAddressUrl",
  "latitude",
  "longitude",
  "phoneNumber",
  "description",
  "facilities",
  "services",
  "serviceStartDate",
  "serviceEndDate",
  "maleCapacity",
  "femaleCapacity",
  "imageUrl",
  "distanceToShrine",
  "distanceToBusStation",
  "distanceToMetro",
  "lunchReception",
  "breakfastReception",
  "dinnerReception",
  "bathroom",
  "laundry",
  "parking",
  "internet",
  "familyFriendly",
  "elevator",
  "stairs",
  "maxReservationDays",
  "defaultReservationDays",
  "country",
  "mawkibCity",
  "rules",
  "telegramChannel",
  "whatsapp",
  "bale",
  "eitaa",
  "websiteUrl",
  "defaultCheckInTime",
  "defaultCheckOutTime",
  "onlineReservationEnabled",
  "autoApprovePilgrimReservations",
  "recordCheckInOnReservationConfirm",
  "skipCapacityCheckEnabled",
  "mealPlanManagementEnabled",
] as const;

function mapMawkib(row: MawkibRow): Mawkib {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    neshanAddressUrl: row.neshanAddressUrl,
    latitude: row.latitude,
    longitude: row.longitude,
    phoneNumber: row.phoneNumber,
    description: row.description,
    facilities: row.facilities,
    services: row.services,
    serviceStartDate: row.serviceStartDate,
    serviceEndDate: row.serviceEndDate,
    maleCapacity: row.maleCapacity,
    femaleCapacity: row.femaleCapacity,
    imageUrl: row.imageUrl,
    distanceToShrine: row.distanceToShrine,
    distanceToBusStation: row.distanceToBusStation,
    distanceToMetro: row.distanceToMetro,
    lunchReception: boolFromDb(row.lunchReception),
    breakfastReception: boolFromDb(row.breakfastReception),
    dinnerReception: boolFromDb(row.dinnerReception),
    bathroom: boolFromDb(row.bathroom),
    laundry: boolFromDb(row.laundry),
    parking: boolFromDb(row.parking),
    internet: boolFromDb(row.internet),
    familyFriendly: boolFromDb(row.familyFriendly),
    elevator: boolFromDb(row.elevator),
    stairs: boolFromDb(row.stairs),
    maxReservationDays: row.maxReservationDays,
    defaultReservationDays: row.defaultReservationDays,
    country: row.country,
    mawkibCity: row.mawkibCity,
    rules: row.rules,
    telegramChannel: row.telegramChannel,
    whatsapp: row.whatsapp,
    bale: row.bale,
    eitaa: row.eitaa,
    websiteUrl: row.websiteUrl,
    defaultCheckInTime: row.defaultCheckInTime,
    defaultCheckOutTime: row.defaultCheckOutTime,
    onlineReservationEnabled: boolFromDb(row.onlineReservationEnabled),
    autoApprovePilgrimReservations: boolFromDb(
      row.autoApprovePilgrimReservations,
    ),
    recordCheckInOnReservationConfirm: boolFromDb(
      row.recordCheckInOnReservationConfirm,
    ),
    skipCapacityCheckEnabled: boolFromDb(row.skipCapacityCheckEnabled),
    mealPlanManagementEnabled: boolFromDb(row.mealPlanManagementEnabled),
    ownerUserId: row.ownerUserId,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export async function listMawkibs(
  ownerUserId: number,
  filters: MawkibListFilters = {},
): Promise<Mawkib[]> {
  const db = await getDatabase();
  const clauses = ["ownerUserId = ?"];
  const params: (string | number)[] = [ownerUserId];

  if (filters.query) {
    clauses.push("(name LIKE ? OR address LIKE ? OR phoneNumber LIKE ?)");
    const q = `%${filters.query.trim()}%`;
    params.push(q, q, q);
  }
  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.mawkibCity) {
    clauses.push("mawkibCity = ?");
    params.push(filters.mawkibCity);
  }

  const rows = await db.getAllAsync<MawkibRow>(
    `SELECT * FROM mawkibs WHERE ${clauses.join(" AND ")} ORDER BY createdAt DESC`,
    params,
  );
  return rows.map(mapMawkib);
}

export async function getMawkibById(
  ownerUserId: number,
  id: number,
): Promise<Mawkib | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MawkibRow>(
    "SELECT * FROM mawkibs WHERE id = ? AND ownerUserId = ?",
    [id, ownerUserId],
  );
  return row ? mapMawkib(row) : null;
}

export async function createMawkib(
  ownerUserId: number,
  input: MawkibInput,
): Promise<Mawkib> {
  validateMawkibInput(input);

  const db = await getDatabase();
  const columns = [...EDITABLE_MAWKIB_COLUMNS, "ownerUserId"];
  const values = [...mawkibInputValues(input), ownerUserId];
  const result = await db.runAsync(
    `INSERT INTO mawkibs (${columns.join(", ")})
     VALUES (${columns.map(() => "?").join(", ")})`,
    values,
  );

  const row = await db.getFirstAsync<MawkibRow>(
    "SELECT * FROM mawkibs WHERE id = ?",
    [result.lastInsertRowId],
  );
  if (!row) throw new Error("خطا در ثبت موکب");
  return mapMawkib(row);
}

export async function updateMawkib(
  ownerUserId: number,
  id: number,
  input: MawkibInput,
): Promise<Mawkib> {
  validateMawkibInput(input);
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE mawkibs SET
      ${EDITABLE_MAWKIB_COLUMNS.map((column) => `${column} = ?`).join(", ")}
     WHERE id = ? AND ownerUserId = ?`,
    [
      ...mawkibInputValues(input),
      id,
      ownerUserId,
    ],
  );

  const mawkib = await getMawkibById(ownerUserId, id);
  if (!mawkib) throw new Error("موکب یافت نشد");
  return mawkib;
}

export async function deleteMawkib(
  ownerUserId: number,
  id: number,
): Promise<void> {
  const db = await getDatabase();
  const hasReservations = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM reservations WHERE mawkibId = ?",
    [id],
  );
  if ((hasReservations?.count ?? 0) > 0) {
    throw new Error("این موکب رزرو دارد و قابل حذف نیست");
  }
  await db.runAsync("DELETE FROM mawkibs WHERE id = ? AND ownerUserId = ?", [
    id,
    ownerUserId,
  ]);
}

export async function getDashboardStats(ownerUserId: number) {
  const db = await getDatabase();
  const stats = await db.getFirstAsync<{
    mawkibCount: number;
    pilgrimCount: number;
    totalReservations: number;
    pendingReservations: number;
    presentGuests: number;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM mawkibs WHERE ownerUserId = ?) as mawkibCount,
      (SELECT COUNT(DISTINCT u.id) FROM users u
        INNER JOIN user_roles ur ON ur.userId = u.id
        INNER JOIN roles r ON r.id = ur.roleId AND r.name = 'Pilgrim') as pilgrimCount,
      (SELECT COUNT(*) FROM reservations r
        INNER JOIN mawkibs m ON m.id = r.mawkibId
        WHERE m.ownerUserId = ?) as totalReservations,
      (SELECT COUNT(*) FROM reservations r
        INNER JOIN mawkibs m ON m.id = r.mawkibId
        WHERE m.ownerUserId = ? AND r.status = 'Pending') as pendingReservations,
      (SELECT COALESCE(SUM(r.maleGuestCount + r.femaleGuestCount), 0)
        FROM reservations r
        INNER JOIN mawkibs m ON m.id = r.mawkibId
        WHERE m.ownerUserId = ? AND r.presenceState = 'PRESENT') as presentGuests`,
    [ownerUserId, ownerUserId, ownerUserId, ownerUserId],
  );

  return {
    mawkibCount: stats?.mawkibCount ?? 0,
    pilgrimCount: stats?.pilgrimCount ?? 0,
    totalReservations: stats?.totalReservations ?? 0,
    pendingReservations: stats?.pendingReservations ?? 0,
    presentGuests: stats?.presentGuests ?? 0,
  };
}
