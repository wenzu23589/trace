import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Custom domain (trace.lfcstudies.com) serves from root, so base is "/".
// If you ever host at username.github.io/trace-app instead, change base to "/trace-app/".
export default defineConfig({
  plugins: [react()],
  base: "/",
});
