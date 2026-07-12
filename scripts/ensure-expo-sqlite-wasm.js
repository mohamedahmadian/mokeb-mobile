const fs = require("fs");
const https = require("https");
const path = require("path");

const wasmPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-sqlite",
  "web",
  "wa-sqlite",
  "wa-sqlite.wasm"
);

const wasmUrl =
  "https://raw.githubusercontent.com/expo/expo/refs/heads/main/packages/expo-sqlite/web/wa-sqlite/wa-sqlite.wasm";

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          fs.unlinkSync(destination);
          downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destination);
          reject(
            new Error(
              `Failed to download wa-sqlite.wasm (status ${response.statusCode})`
            )
          );
          return;
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (error) => {
        file.close();
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }
        reject(error);
      });
  });
}

async function main() {
  if (fs.existsSync(wasmPath)) {
    return;
  }

  fs.mkdirSync(path.dirname(wasmPath), { recursive: true });
  await downloadFile(wasmUrl, wasmPath);
  console.log("Downloaded missing expo-sqlite wa-sqlite.wasm for web support.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
