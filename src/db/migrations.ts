export const MIGRATION_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fullName TEXT NOT NULL,
  mobileNumber TEXT NOT NULL UNIQUE,
  nationalId TEXT,
  nationalIdCardImageUrl TEXT,
  imageUrl TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  birthDate TEXT,
  country TEXT DEFAULT 'ایران',
  passportNumber TEXT,
  passwordHash TEXT NOT NULL,
  province TEXT,
  city TEXT,
  address TEXT,
  carPlate TEXT,
  description TEXT,
  whatsapp TEXT,
  telegram TEXT,
  bale TEXT,
  eitaa TEXT,
  email TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  userId INTEGER NOT NULL,
  roleId INTEGER NOT NULL,
  PRIMARY KEY (userId, roleId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mawkibs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  neshanAddressUrl TEXT,
  latitude REAL,
  longitude REAL,
  phoneNumber TEXT NOT NULL,
  description TEXT,
  facilities TEXT,
  services TEXT,
  serviceStartDate TEXT,
  serviceEndDate TEXT,
  maleCapacity INTEGER NOT NULL,
  femaleCapacity INTEGER NOT NULL,
  imageUrl TEXT,
  distanceToShrine TEXT,
  distanceToBusStation TEXT,
  distanceToMetro TEXT,
  lunchReception INTEGER NOT NULL DEFAULT 0,
  breakfastReception INTEGER NOT NULL DEFAULT 0,
  dinnerReception INTEGER NOT NULL DEFAULT 0,
  bathroom INTEGER NOT NULL DEFAULT 0,
  laundry INTEGER NOT NULL DEFAULT 0,
  parking INTEGER NOT NULL DEFAULT 0,
  internet INTEGER NOT NULL DEFAULT 0,
  familyFriendly INTEGER NOT NULL DEFAULT 0,
  elevator INTEGER NOT NULL DEFAULT 0,
  stairs INTEGER NOT NULL DEFAULT 0,
  maxReservationDays INTEGER NOT NULL DEFAULT 7,
  defaultReservationDays INTEGER NOT NULL DEFAULT 1,
  country TEXT NOT NULL DEFAULT 'Iran' CHECK (country IN ('Iran', 'Iraq')),
  mawkibCity TEXT CHECK (mawkibCity IN ('Mashhad', 'Qom', 'Najaf', 'Karbala')),
  rules TEXT,
  telegramChannel TEXT,
  whatsapp TEXT,
  bale TEXT,
  eitaa TEXT,
  websiteUrl TEXT,
  defaultCheckInTime TEXT NOT NULL DEFAULT '14:00',
  defaultCheckOutTime TEXT NOT NULL DEFAULT '11:00',
  onlineReservationEnabled INTEGER NOT NULL DEFAULT 1,
  autoApprovePilgrimReservations INTEGER NOT NULL DEFAULT 0,
  recordCheckInOnReservationConfirm INTEGER NOT NULL DEFAULT 0,
  skipCapacityCheckEnabled INTEGER NOT NULL DEFAULT 0,
  mealPlanManagementEnabled INTEGER NOT NULL DEFAULT 0,
  ownerUserId INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ownerUserId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS mawkib_daily_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mawkibId INTEGER NOT NULL,
  date TEXT NOT NULL,
  reservedMale INTEGER NOT NULL DEFAULT 0,
  reservedFemale INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (mawkibId, date),
  FOREIGN KEY (mawkibId) REFERENCES mawkibs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mawkibId INTEGER NOT NULL,
  pilgrimUserId INTEGER NOT NULL,
  reservedByUserId INTEGER NOT NULL,
  reservationDate TEXT NOT NULL,
  reservationEndDate TEXT NOT NULL,
  plannedCheckInTime TEXT,
  plannedCheckOutTime TEXT,
  actualCheckInAt TEXT,
  actualCheckOutAt TEXT,
  maleGuestCount INTEGER NOT NULL,
  femaleGuestCount INTEGER NOT NULL,
  trackingCode TEXT NOT NULL UNIQUE,
  pilgrimMobile TEXT NOT NULL,
  companions TEXT,
  description TEXT,
  travelOrigin TEXT,
  cancellationNote TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')),
  presenceState TEXT NOT NULL DEFAULT 'NOT_ARRIVED' CHECK (presenceState IN ('NOT_ARRIVED', 'PRESENT', 'TEMPORARILY_OUT', 'LEFT')),
  lastStatusUpdatedByUserId INTEGER,
  lastStatusUpdatedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (mawkibId) REFERENCES mawkibs(id),
  FOREIGN KEY (pilgrimUserId) REFERENCES users(id),
  FOREIGN KEY (reservedByUserId) REFERENCES users(id),
  FOREIGN KEY (lastStatusUpdatedByUserId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reservation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservationId INTEGER NOT NULL,
  eventType TEXT NOT NULL CHECK (eventType IN ('CHECK_IN', 'TEMP_OUT', 'TEMP_IN', 'EARLY_CHECKOUT')),
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  createdByUserId INTEGER NOT NULL,
  description TEXT,
  FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (createdByUserId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservationId INTEGER NOT NULL,
  date TEXT NOT NULL,
  mealType TEXT NOT NULL CHECK (mealType IN ('Breakfast', 'Lunch', 'Dinner')),
  isRequired INTEGER NOT NULL DEFAULT 1,
  isServed INTEGER NOT NULL DEFAULT 0,
  servedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reservationId, date, mealType),
  FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservation_delivered_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservationId INTEGER NOT NULL,
  itemName TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('DeliveredToGuest', 'ReceivedFromGuest')),
  recordedByUserId INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  receivedAt TEXT,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (recordedByUserId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_mawkib_date ON reservations(mawkibId, reservationDate);
CREATE INDEX IF NOT EXISTS idx_reservations_presence ON reservations(mawkibId, presenceState);
CREATE INDEX IF NOT EXISTS idx_reservation_events_reservation ON reservation_events(reservationId, createdAt);
CREATE INDEX IF NOT EXISTS idx_meal_plans_reservation ON meal_plans(reservationId, date);
CREATE INDEX IF NOT EXISTS idx_delivered_items_reservation ON reservation_delivered_items(reservationId);
`;

export const SEED_ROLES_SQL = `
INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'MawkibOwner');
INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'Pilgrim');
`;

// CREATE TABLE IF NOT EXISTS ستون‌های جدید را به دیتابیس‌های نصب‌شده اضافه نمی‌کند.
// این فهرست در زمان راه‌اندازی با PRAGMA بررسی و فقط ستون‌های مفقود اضافه می‌شود.
export const USER_COLUMN_MIGRATIONS = [
  ["nationalId", "TEXT"],
  ["nationalIdCardImageUrl", "TEXT"],
  ["imageUrl", "TEXT"],
  ["gender", "TEXT CHECK (gender IN ('Male', 'Female'))"],
  ["birthDate", "TEXT"],
  ["country", "TEXT DEFAULT 'ایران'"],
  ["passportNumber", "TEXT"],
  ["province", "TEXT"],
  ["city", "TEXT"],
  ["address", "TEXT"],
  ["carPlate", "TEXT"],
  ["description", "TEXT"],
  ["whatsapp", "TEXT"],
  ["telegram", "TEXT"],
  ["bale", "TEXT"],
  ["eitaa", "TEXT"],
  ["email", "TEXT"],
] as const;

// دیتابیس‌های نصب‌شده ممکن است جدول قدیمی و ساده‌شدهٔ موکب‌ها را داشته باشند.
// همهٔ ستون‌های مدل کامل موکب هنگام راه‌اندازی بررسی و در صورت نیاز اضافه می‌شوند.
export const MAWKIB_COLUMN_MIGRATIONS = [
  ["neshanAddressUrl", "TEXT"],
  ["latitude", "REAL"],
  ["longitude", "REAL"],
  ["description", "TEXT"],
  ["facilities", "TEXT"],
  ["services", "TEXT"],
  ["serviceStartDate", "TEXT"],
  ["serviceEndDate", "TEXT"],
  ["imageUrl", "TEXT"],
  ["distanceToShrine", "TEXT"],
  ["distanceToBusStation", "TEXT"],
  ["distanceToMetro", "TEXT"],
  ["lunchReception", "INTEGER NOT NULL DEFAULT 0"],
  ["breakfastReception", "INTEGER NOT NULL DEFAULT 0"],
  ["dinnerReception", "INTEGER NOT NULL DEFAULT 0"],
  ["bathroom", "INTEGER NOT NULL DEFAULT 0"],
  ["laundry", "INTEGER NOT NULL DEFAULT 0"],
  ["parking", "INTEGER NOT NULL DEFAULT 0"],
  ["internet", "INTEGER NOT NULL DEFAULT 0"],
  ["familyFriendly", "INTEGER NOT NULL DEFAULT 0"],
  ["elevator", "INTEGER NOT NULL DEFAULT 0"],
  ["stairs", "INTEGER NOT NULL DEFAULT 0"],
  ["maxReservationDays", "INTEGER DEFAULT 7"],
  ["defaultReservationDays", "INTEGER DEFAULT 1"],
  ["country", "TEXT NOT NULL DEFAULT 'Iran'"],
  ["mawkibCity", "TEXT"],
  ["rules", "TEXT"],
  ["telegramChannel", "TEXT"],
  ["whatsapp", "TEXT"],
  ["bale", "TEXT"],
  ["eitaa", "TEXT"],
  ["websiteUrl", "TEXT"],
  ["defaultCheckInTime", "TEXT NOT NULL DEFAULT '14:00'"],
  ["defaultCheckOutTime", "TEXT NOT NULL DEFAULT '11:00'"],
  ["onlineReservationEnabled", "INTEGER NOT NULL DEFAULT 1"],
  ["autoApprovePilgrimReservations", "INTEGER NOT NULL DEFAULT 0"],
  ["recordCheckInOnReservationConfirm", "INTEGER NOT NULL DEFAULT 0"],
  ["skipCapacityCheckEnabled", "INTEGER NOT NULL DEFAULT 0"],
  ["mealPlanManagementEnabled", "INTEGER NOT NULL DEFAULT 0"],
] as const;
