import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { odooApiPlugin } from "./vite-plugin-odoo-api";

export default defineConfig({
  plugins: [react(), tailwindcss(), odooApiPlugin()],
});
