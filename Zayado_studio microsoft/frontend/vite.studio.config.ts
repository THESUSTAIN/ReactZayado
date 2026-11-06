// Build du Studio Zayado (studio.zayado.net) : même configuration que l'application
// (alias @ → src, Tailwind, polices), seule l'entrée change. Sortie : dist-studio/.
import path from "node:path";
import { defineConfig, type ConfigEnv, type UserConfig } from "vite";
import base from "./vite.config";

export default defineConfig(async (env: ConfigEnv) => {
  const c = (typeof base === "function" ? await base(env) : base) as UserConfig;
  return {
    ...c,
    build: {
      outDir: "dist-studio",
      emptyOutDir: true,
      rollupOptions: { input: path.resolve(__dirname, "studio/index.html") },
    },
  } satisfies UserConfig;
});
