import { getDatabase } from "@/src/db/client";
import type {
  DeliveredItemListFilters,
  ReservationDeliveredItem,
  ReservationDeliveredItemStatus,
} from "@/src/types";

type DeliveredItemRow = {
  id: number;
  reservationId: number;
  itemName: string;
  quantity: number;
  description: string | null;
  status: ReservationDeliveredItemStatus;
  recordedByUserId: number;
  createdAt: string;
  receivedAt: string | null;
  updatedAt: string;
  recordedByName: string;
  trackingCode: string;
  pilgrimName: string;
};

function mapDeliveredItem(row: DeliveredItemRow): ReservationDeliveredItem {
  return {
    id: row.id,
    reservationId: row.reservationId,
    itemName: row.itemName,
    quantity: row.quantity,
    description: row.description,
    status: row.status,
    recordedByUserId: row.recordedByUserId,
    createdAt: row.createdAt,
    receivedAt: row.receivedAt,
    updatedAt: row.updatedAt,
    recordedByName: row.recordedByName,
    trackingCode: row.trackingCode,
    pilgrimName: row.pilgrimName,
  };
}

export async function listDeliveredItems(
  ownerUserId: number,
  filters: DeliveredItemListFilters = {},
): Promise<ReservationDeliveredItem[]> {
  const db = await getDatabase();
  const clauses = ["m.ownerUserId = ?"];
  const params: (string | number)[] = [ownerUserId];

  if (filters.query) {
    clauses.push(
      "(di.itemName LIKE ? OR r.trackingCode LIKE ? OR p.fullName LIKE ?)",
    );
    const q = `%${filters.query.trim()}%`;
    params.push(q, q, q);
  }
  if (filters.status) {
    clauses.push("di.status = ?");
    params.push(filters.status);
  }
  if (filters.mawkibId) {
    clauses.push("r.mawkibId = ?");
    params.push(filters.mawkibId);
  }

  const rows = await db.getAllAsync<DeliveredItemRow>(
    `SELECT di.*, u.fullName as recordedByName,
            r.trackingCode, p.fullName as pilgrimName
     FROM reservation_delivered_items di
     INNER JOIN reservations r ON r.id = di.reservationId
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     INNER JOIN users u ON u.id = di.recordedByUserId
     WHERE ${clauses.join(" AND ")}
     ORDER BY di.createdAt DESC`,
    params,
  );

  return rows.map(mapDeliveredItem);
}

export async function listDeliveredItemsByReservation(
  ownerUserId: number,
  reservationId: number,
): Promise<ReservationDeliveredItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DeliveredItemRow>(
    `SELECT di.*, u.fullName as recordedByName,
            r.trackingCode, p.fullName as pilgrimName
     FROM reservation_delivered_items di
     INNER JOIN reservations r ON r.id = di.reservationId
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     INNER JOIN users u ON u.id = di.recordedByUserId
     WHERE di.reservationId = ? AND m.ownerUserId = ?
     ORDER BY di.createdAt DESC`,
    [reservationId, ownerUserId],
  );
  return rows.map(mapDeliveredItem);
}

export async function createDeliveredItem(
  ownerUserId: number,
  input: {
    reservationId: number;
    itemName: string;
    quantity: number;
    description?: string;
    status: ReservationDeliveredItemStatus;
  },
): Promise<ReservationDeliveredItem> {
  if (!input.itemName.trim()) throw new Error("نام امانت را وارد کنید");
  if (input.quantity <= 0) throw new Error("تعداد باید بیشتر از صفر باشد");

  const db = await getDatabase();
  const reservation = await db.getFirstAsync<{ id: number }>(
    `SELECT r.id FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE r.id = ? AND m.ownerUserId = ?`,
    [input.reservationId, ownerUserId],
  );
  if (!reservation) throw new Error("رزرو یافت نشد");

  const result = await db.runAsync(
    `INSERT INTO reservation_delivered_items (
      reservationId, itemName, quantity, description, status, recordedByUserId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      input.reservationId,
      input.itemName.trim(),
      input.quantity,
      input.description?.trim() || null,
      input.status,
      ownerUserId,
    ],
  );

  const items = await listDeliveredItemsByReservation(
    ownerUserId,
    input.reservationId,
  );
  const created = items.find((item) => item.id === result.lastInsertRowId);
  if (!created) throw new Error("خطا در ثبت امانت");
  return created;
}

export async function updateDeliveredItem(
  ownerUserId: number,
  id: number,
  input: Partial<{
    itemName: string;
    quantity: number;
    description: string;
    status: ReservationDeliveredItemStatus;
  }>,
): Promise<ReservationDeliveredItem> {
  const db = await getDatabase();
  const receivedAt =
    input.status === "ReceivedFromGuest" ? new Date().toISOString() : null;

  const result = await db.runAsync(
    `UPDATE reservation_delivered_items SET
      itemName = COALESCE(?, itemName),
      quantity = COALESCE(?, quantity),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      receivedAt = CASE WHEN ? IS NOT NULL THEN ? ELSE receivedAt END,
      updatedAt = datetime('now')
     WHERE id = ? AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [
      input.itemName?.trim() || null,
      input.quantity ?? null,
      input.description?.trim() || null,
      input.status ?? null,
      receivedAt,
      receivedAt,
      id,
      ownerUserId,
    ],
  );
  if (!result.changes) throw new Error("امانت یافت نشد");

  const row = await db.getFirstAsync<DeliveredItemRow>(
    `SELECT di.*, u.fullName as recordedByName,
            r.trackingCode, p.fullName as pilgrimName
     FROM reservation_delivered_items di
     INNER JOIN reservations r ON r.id = di.reservationId
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     INNER JOIN users p ON p.id = r.pilgrimUserId
     INNER JOIN users u ON u.id = di.recordedByUserId
     WHERE di.id = ?`,
    [id],
  );
  if (!row) throw new Error("امانت یافت نشد");
  return mapDeliveredItem(row);
}

export async function deleteDeliveredItem(
  ownerUserId: number,
  id: number,
): Promise<void> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `DELETE FROM reservation_delivered_items
     WHERE id = ? AND reservationId IN (
       SELECT r.id FROM reservations r
       INNER JOIN mawkibs m ON m.id = r.mawkibId
       WHERE m.ownerUserId = ?
     )`,
    [id, ownerUserId],
  );
  if (!result.changes) throw new Error("امانت یافت نشد");
}
