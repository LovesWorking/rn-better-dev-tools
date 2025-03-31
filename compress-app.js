#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { execSync } = require("child_process");

/**
 * Script to compress the built application to a smaller size
 * This will create a more optimized ZIP file than the standard maker
 */

// Check if archiver is installed
try {
  require("archiver");
} catch (err) {
  console.log("Installing archiver package...");
  execSync("npm install archiver --no-save");
}

// Paths
const outDir = path.join(__dirname, "out");
const makeDir = path.join(outDir, "make");
const zipDir = path.join(makeDir, "zip", "darwin", "arm64");
const packageDir = path.join(outDir, "React Native DevTools-darwin-arm64");

// Get package version
const packageJson = require("./package.json");
const version = packageJson.version;

// Output file
const outputZip = path.join(
  zipDir,
  `React Native DevTools-darwin-arm64-${version}-compressed.zip`
);

// Create output directory if it doesn't exist
if (!fs.existsSync(zipDir)) {
  fs.mkdirSync(zipDir, { recursive: true });
}

// Create a file to stream archive data to
const output = fs.createWriteStream(outputZip);
const archive = archiver("zip", {
  zlib: { level: 9 }, // Maximum compression
});

// Listen for all archive data to be written
output.on("close", function () {
  console.log(`Successfully compressed app: ${outputZip}`);
  console.log(`Final size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// Handle warnings and errors
archive.on("warning", function (err) {
  if (err.code === "ENOENT") {
    console.warn("Warning:", err);
  } else {
    throw err;
  }
});

archive.on("error", function (err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add the .app directory with custom settings
if (fs.existsSync(packageDir)) {
  // Get the app name
  const appFiles = fs
    .readdirSync(packageDir)
    .filter((file) => file.endsWith(".app"));

  if (appFiles.length > 0) {
    const appName = appFiles[0];
    const appPath = path.join(packageDir, appName);

    console.log(`Compressing ${appName}...`);

    // Add the .app directory with compression
    archive.directory(appPath, appName, {
      // Skip unnecessary files to further reduce size
      filter: function (entry) {
        // Skip source maps, development files, and other unnecessary files
        return (
          !entry.includes(".map") &&
          !entry.includes(".git") &&
          !entry.includes("node_modules/.pnpm") &&
          !entry.includes(".vscode")
        );
      },
    });

    // Finalize the archive (i.e. we are done appending files)
    archive.finalize();

    console.log("Compression started, please wait...");
  } else {
    console.error("No .app file found in the package directory");
    process.exit(1);
  }
} else {
  console.error(`Package directory not found: ${packageDir}`);
  console.error('Make sure to run "pnpm run make" before running this script');
  process.exit(1);
}
