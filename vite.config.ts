import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "261a-81-40-216-157.ngrok-free.a",
      "4476-81-40-216-157.ngrok-free.app",
    ],
  },
});
