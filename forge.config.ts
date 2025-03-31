import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./assets/icon", // No file extension required
    appBundleId: "com.lovesworking.rn-dev-tools",
    appCategoryType: "public.app-category.developer-tools",
    executableName: "React Native DevTools",
    // Add options to reduce package size but make sure to keep necessary files
    ignore: [
      // Exclude these patterns from the final package
      "/node_modules/\\.pnpm/",
      "/\\.git($|/)",
      "/\\.vscode($|/)",
      "\\.map$",
      "/\\.npmrc$",
      "/fixed-tanstack-.+\\.tgz$",
      "/release\\.sh$",
      // Exclude test files
      "/test($|/)",
      "/\\.(test|spec)\\.ts$",

      // We need a whitelist approach for source files to make sure we don't exclude important files
      // The regex below excludes all in the src directory EXCEPT:
      // 1. main.ts and preload.ts (required entry points)
      // 2. components directory (contains UI components)
      // 3. config.ts (contains configuration)
      // This is safer than using a function which TypeScript doesn't accept here
      "^/src/(?!main\\.ts$)(?!preload\\.ts$)(?!components/)(?!config\\.ts$)(?!.*\\.d\\.ts$).*$",
    ],
    // Only include necessary node modules
    prune: true,
    // Remove devDependencies
    overwrite: true,
  },
  rebuildConfig: {},
  makers: [
    // Only build for macOS with ZIP
    new MakerZIP({}, ["darwin"]),
    // The following makers are commented out as we're focusing on macOS
    // new MakerSquirrel({}),
    // new MakerRpm({}),
    // new MakerDeb({})
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
