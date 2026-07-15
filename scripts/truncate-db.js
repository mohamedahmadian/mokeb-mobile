/**
 * پاک‌سازی کامل دادهٔ محلی اپ روی دستگاه/شبیه‌ساز اندروید.
 *
 * دیتابیس SQLite داخل دستگاه است؛ این اسکریپت با adb دادهٔ اپ را خالی می‌کند
 * (شامل mokeb.db و نشست SecureStore).
 *
 * Usage:
 *   npm run truncate
 *
 * پیش‌نیاز: دستگاه/امولاتور متصل (`adb devices`) و اپ با پکیج com.mokeb.mobile نصب باشد.
 */

const { execSync } = require("child_process");

const PACKAGE = "com.mokeb.mobile";

function run(command, options = {}) {
  return execSync(command, {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
    ...options,
  });
}

function listDevices() {
  let output;
  try {
    output = run("adb devices");
  } catch {
    console.error(
      "خطا: adb در PATH پیدا نشد. Android SDK Platform-Tools را نصب کنید.",
    );
    process.exit(1);
  }

  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith("\tdevice") || line.endsWith(" device"))
    .map((line) => line.split(/\s+/)[0]);
}

function main() {
  const devices = listDevices();
  if (devices.length === 0) {
    console.error(
      "هیچ دستگاه یا شبیه‌ساز آماده‌ای پیدا نشد.\nابتدا امولاتور را روشن کنید یا گوشی را با USB Debugging وصل کنید.",
    );
    process.exit(1);
  }

  console.log(`دستگاه‌ها: ${devices.join(", ")}`);
  console.log(`در حال پاک‌سازی دادهٔ «${PACKAGE}» ...`);

  try {
    run(`adb shell pm clear ${PACKAGE}`, { inherit: true });
  } catch {
    console.error(
      `\nپاک‌سازی ناموفق بود. مطمئن شوید اپ با پکیج ${PACKAGE} روی دستگاه نصب است\n(مثلاً با npm run android یا EAS build).`,
    );
    process.exit(1);
  }

  console.log("");
  console.log("✓ دیتابیس SQLite و نشست کاربر پاک شدند.");
  console.log("  برنامه را دوباره باز کنید تا اسکیما از نو ساخته شود.");
}

main();
