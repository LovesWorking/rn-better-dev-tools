import { config as dotenvConfig } from "dotenv";
import * as path from "path";

// Load .env file from the project root
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

// Debug logging to verify environment variables
console.log("Environment variables loaded:", {
  APPLE_ID: process.env.APPLE_ID,
  TEAM_ID: process.env.APPLE_TEAM_ID,
  DEBUG: process.env.DEBUG,
});

import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerZIP } from "@electron-forge/maker-zip";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { PublisherGithub } from "@electron-forge/publisher-github";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./assets/icon", // No file extension required
    appBundleId: "com.lovesworking.rn-dev-tools",
    appCategoryType: "public.app-category.developer-tools",
    executableName: "React Native DevTools",
    osxSign: {
      identity: "6EC9AE0A608BB7CBBA6BCC7936689773E76D63F0",
    },
    // The osxSign config comes with defaults that work out of the box in most cases, so we recommend you start with an empty configuration object.
    // For a full list of configuration options, see  https://js.electronforge.io/modules/_electron_forge_shared_types.InternalOptions.html#OsxSignOptions
    osxNotarize: {
      appleId: process.env.APPLE_ID!,
      appleIdPassword: process.env.APPLE_PASSWORD!,
      teamId: process.env.APPLE_TEAM_ID!,
    },
  },
  rebuildConfig: {},
  makers: [
    // Build a ZIP for all platforms
    new MakerZIP({}, ["darwin", "linux", "win32"]),
    // The following makers are commented out for now
    // new MakerSquirrel({}),
    // new MakerRpm({}),
    // new MakerDeb({})
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: "lovesworking", // Replace with your GitHub username or organization
        name: "rn-better-dev-tools", // Replace with your repository name
      },
      prerelease: false, // Set to true if you want to mark releases as pre-releases
    }),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
