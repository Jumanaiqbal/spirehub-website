import type { Plugin } from "vite";
import { loadEnv } from "vite";
import { handleOdooApi } from "./server/api";

export function odooApiPlugin(): Plugin {
  return {
    name: "odoo-api",
    configureServer(server) {
      const env = loadEnv("development", process.cwd(), "");

      server.middlewares.use(async (req, res, next) => {
        const handled = await handleOdooApi(req, res, env);
        if (!handled) next();
      });
    },
  };
}
