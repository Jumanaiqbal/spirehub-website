import { defineConfig } from "vite";
import type {} from "vite-react-ssg";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { odooApiPlugin } from "./vite-plugin-odoo-api";

export default defineConfig({
  plugins: [react(), tailwindcss(), odooApiPlugin()],
  // vite-react-ssg: emit dist/<route>/index.html so the prod server can serve
  // each pre-rendered route as a plain static file.
  ssgOptions: {
    dirStyle: "nested",
  },
});
