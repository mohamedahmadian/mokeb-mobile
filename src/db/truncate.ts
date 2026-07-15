import * as SecureStore from "expo-secure-store";
import { getDatabase } from "@/src/db/client";
import { SEED_ROLES_SQL } from "@/src/db/migrations";

const SESSION_KEY = "mokeb_session_user_id";

/**
 * حذف تمام ردیف‌های داده از SQLite (نقش‌ها دوباره seed می‌شوند)
 * و پاک کردن نشست کاربر. برای تست داخل اپ قابل فراخوانی است.
 */
export async function truncateDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM reservation_delivered_items;
    DELETE FROM meal_plans;
    DELETE FROM reservation_events;
    DELETE FROM reservations;
    DELETE FROM mawkib_daily_inventory;
    DELETE FROM mawkibs;
    DELETE FROM user_roles;
    DELETE FROM users;
    PRAGMA foreign_keys = ON;
  `);

  try {
    await db.execAsync("DELETE FROM sqlite_sequence;");
  } catch {
    // جدول شمارنده ممکن است هنوز ساخته نشده باشد
  }

  await db.execAsync(SEED_ROLES_SQL);
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
