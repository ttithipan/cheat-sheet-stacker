import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves from /cheat-sheet-stacker/ — only applied during build
  base: command === "build" ? "/cheat-sheet-stacker/" : "/",
}));
