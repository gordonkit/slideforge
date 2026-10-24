import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { seoPagesPlugin } from "./seo.ts";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, "dist");

export default defineConfig({
  root,
  base: "/",
  plugins: [tailwindcss(), react(), seoPagesPlugin(outDir)],
  build: {
    outDir,
    emptyOutDir: true,
  },
});
