import { getDatabase } from "@/src/db/client";
import { countPilgrims } from "@/src/services/pilgrims";
import { countReservations } from "@/src/services/reservations";

export type ManageSection =
  | "pilgrims"
  | "reservations"
  | "attendance"
  | "meals";

export type ManagementStats = {
  pilgrims: number;
  reservations: number;
  attendanceEvents: number;
  mealPlans: number;
};

export type PilgrimSectionStats = {
  reservations: number;
  attendanceEvents: number;
  mealPlans: number;
};

const ownerReservationIds = `
  SELECT r.id FROM reservations r
  INNER JOIN mawkibs m ON m.id = r.mawkibId
  WHERE m.ownerUserId = ?
`;

const pilgrimOwnerReservationIds = `
  SELECT r.id FROM reservations r
  INNER JOIN mawkibs m ON m.id = r.mawkibId
  WHERE m.ownerUserId = ? AND r.pilgrimUserId = ?
`;

export async function countAttendanceEvents(
  ownerUserId: number,
): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM reservation_events e
     WHERE e.reservationId IN (${ownerReservationIds})`,
    [ownerUserId],
  );
  return row?.count ?? 0;
}

export async function countMealPlans(ownerUserId: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM meal_plans mp
     WHERE mp.reservationId IN (${ownerReservationIds})`,
    [ownerUserId],
  );
  return row?.count ?? 0;
}

export async function getManagementStats(
  ownerUserId: number,
): Promise<ManagementStats> {
  const [pilgrims, reservations, attendanceEvents, mealPlans] =
    await Promise.all([
      countPilgrims(ownerUserId),
      countReservations(ownerUserId),
      countAttendanceEvents(ownerUserId),
      countMealPlans(ownerUserId),
    ]);

  return { pilgrims, reservations, attendanceEvents, mealPlans };
}

export async function getPilgrimSectionStats(
  ownerUserId: number,
  pilgrimUserId: number,
): Promise<PilgrimSectionStats> {
  const db = await getDatabase();

  const reservations = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM reservations r
     INNER JOIN mawkibs m ON m.id = r.mawkibId
     WHERE m.ownerUserId = ? AND r.pilgrimUserId = ?`,
    [ownerUserId, pilgrimUserId],
  );

  const attendanceEvents = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM reservation_events e
     WHERE e.reservationId IN (${pilgrimOwnerReservationIds})`,
    [ownerUserId, pilgrimUserId],
  );

  const mealPlans = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM meal_plans mp
     WHERE mp.reservationId IN (${pilgrimOwnerReservationIds})`,
    [ownerUserId, pilgrimUserId],
  );

  return {
    reservations: reservations?.count ?? 0,
    attendanceEvents: attendanceEvents?.count ?? 0,
    mealPlans: mealPlans?.count ?? 0,
  };
}

async function deleteOwnerReservations(ownerUserId: number) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM reservations
     WHERE mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [ownerUserId],
  );
}

async function deletePilgrimOwnerReservations(
  ownerUserId: number,
  pilgrimUserId: number,
) {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM reservations
     WHERE pilgrimUserId = ?
       AND mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [pilgrimUserId, ownerUserId],
  );
}

async function deleteOrphanPilgrim(pilgrimUserId: number, ownerUserId: number) {
  const db = await getDatabase();

  const isOwner = await db.getFirstAsync<{ id: number }>(
    `SELECT ur.userId as id FROM user_roles ur
     INNER JOIN roles r ON r.id = ur.roleId AND r.name IN ('MawkibOwner', 'MawkibServant')
     WHERE ur.userId = ?`,
    [pilgrimUserId],
  );
  if (isOwner || pilgrimUserId === ownerUserId) return;

  const hasReservations = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM reservations WHERE pilgrimUserId = ? LIMIT 1",
    [pilgrimUserId],
  );
  if (hasReservations) return;

  await db.runAsync("DELETE FROM user_roles WHERE userId = ?", [
    pilgrimUserId,
  ]);
  await db.runAsync("DELETE FROM users WHERE id = ?", [pilgrimUserId]);
}

export async function clearMealsData(ownerUserId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM meal_plans
     WHERE reservationId IN (${ownerReservationIds})`,
    [ownerUserId],
  );
}

export async function clearAttendanceData(ownerUserId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM reservation_events
     WHERE reservationId IN (${ownerReservationIds})`,
    [ownerUserId],
  );
  await db.runAsync(
    `UPDATE reservations
     SET presenceState = 'NOT_ARRIVED',
         actualCheckInAt = NULL,
         actualCheckOutAt = NULL,
         lastStatusUpdatedAt = datetime('now'),
         lastStatusUpdatedByUserId = ?
     WHERE mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [ownerUserId, ownerUserId],
  );
}

export async function clearReservationsData(
  ownerUserId: number,
): Promise<void> {
  await deleteOwnerReservations(ownerUserId);
}

export async function clearPilgrimsData(ownerUserId: number): Promise<void> {
  const db = await getDatabase();

  await deleteOwnerReservations(ownerUserId);

  await db.runAsync(
    `DELETE FROM user_roles
     WHERE roleId = (SELECT id FROM roles WHERE name = 'Pilgrim')
       AND userId IN (
         SELECT u.id FROM users u
         WHERE NOT EXISTS (
           SELECT 1 FROM user_roles ur2
           INNER JOIN roles r2 ON r2.id = ur2.roleId AND r2.name = 'MawkibOwner'
           WHERE ur2.userId = u.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM reservations res WHERE res.pilgrimUserId = u.id
         )
       )`,
  );

  await db.runAsync(
    `DELETE FROM users
     WHERE id NOT IN (SELECT userId FROM user_roles)
       AND id != ?`,
    [ownerUserId],
  );
}

export async function clearMealsDataForPilgrim(
  ownerUserId: number,
  pilgrimUserId: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM meal_plans
     WHERE reservationId IN (${pilgrimOwnerReservationIds})`,
    [ownerUserId, pilgrimUserId],
  );
}

export async function clearAttendanceDataForPilgrim(
  ownerUserId: number,
  pilgrimUserId: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM reservation_events
     WHERE reservationId IN (${pilgrimOwnerReservationIds})`,
    [ownerUserId, pilgrimUserId],
  );
  await db.runAsync(
    `UPDATE reservations
     SET presenceState = 'NOT_ARRIVED',
         actualCheckInAt = NULL,
         actualCheckOutAt = NULL,
         lastStatusUpdatedAt = datetime('now'),
         lastStatusUpdatedByUserId = ?
     WHERE pilgrimUserId = ?
       AND mawkibId IN (SELECT id FROM mawkibs WHERE ownerUserId = ?)`,
    [ownerUserId, pilgrimUserId, ownerUserId],
  );
}

export async function clearReservationsDataForPilgrim(
  ownerUserId: number,
  pilgrimUserId: number,
): Promise<void> {
  await deletePilgrimOwnerReservations(ownerUserId, pilgrimUserId);
}

export async function clearPilgrimsDataForPilgrim(
  ownerUserId: number,
  pilgrimUserId: number,
): Promise<void> {
  await deletePilgrimOwnerReservations(ownerUserId, pilgrimUserId);
  await deleteOrphanPilgrim(pilgrimUserId, ownerUserId);
}

export async function clearSectionData(
  ownerUserId: number,
  section: ManageSection,
): Promise<void> {
  switch (section) {
    case "pilgrims":
      await clearPilgrimsData(ownerUserId);
      break;
    case "reservations":
      await clearReservationsData(ownerUserId);
      break;
    case "attendance":
      await clearAttendanceData(ownerUserId);
      break;
    case "meals":
      await clearMealsData(ownerUserId);
      break;
  }
}

export async function clearSectionDataForPilgrim(
  ownerUserId: number,
  section: ManageSection,
  pilgrimUserId: number,
): Promise<void> {
  switch (section) {
    case "pilgrims":
      await clearPilgrimsDataForPilgrim(ownerUserId, pilgrimUserId);
      break;
    case "reservations":
      await clearReservationsDataForPilgrim(ownerUserId, pilgrimUserId);
      break;
    case "attendance":
      await clearAttendanceDataForPilgrim(ownerUserId, pilgrimUserId);
      break;
    case "meals":
      await clearMealsDataForPilgrim(ownerUserId, pilgrimUserId);
      break;
  }
}
