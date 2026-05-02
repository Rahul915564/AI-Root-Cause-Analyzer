import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm, mkdir } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.resolve(artifactDir, "dist/vercel-app.cjs");

await rm(outfile, { force: true });
await mkdir(path.resolve(artifactDir, "dist"), { recursive: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/vercel-entry.ts")],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile,
  logLevel: "info",
  external: [
    "*.node",
    "pg-native",
    "sharp",
    "canvas",
    "bcrypt",
    "argon2",
    "fsevents",
  ],
  sourcemap: false,
  banner: {
    js: `"use strict";`,
  },
});

console.log("✓ Vercel API bundle written to", outfile);
