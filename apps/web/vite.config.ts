/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const r = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@ssm/validation": r("../../lib/shared/validation/index.ts"),
      "@ssm/utils":      r("../../lib/utils/index.ts"),
      "@ssm/sync":       r("../../lib/sync/index.ts"),
      "@ssm/db":         r("../../lib/db/index.ts"),
      "@ssm/ui":         r("./src/components/ui"),
    },
  },
  build: { sourcemap: false },
  test: { environment: "node" },
});
