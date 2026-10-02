import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Local preview of the Framer code components. "framer" is only available
// inside Framer, so it is replaced by a small stub here.
export default defineConfig({
  root: "preview",
  plugins: [react()],
  resolve: {
    alias: {
      framer: fileURLToPath(new URL("./preview/framer-stub.ts", import.meta.url)),
    },
  },
});
