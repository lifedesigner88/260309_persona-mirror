import { defineConfig } from "vite";

function fromConfigRoot(relativePath: string) {
  const pathname = decodeURIComponent(new URL(relativePath, import.meta.url).pathname);
  return pathname.replace(/^\/([A-Za-z]:\/)/, "$1");
}

export default defineConfig({
  cacheDir: process.env.PERSONA_VITE_CACHE_DIR ?? fromConfigRoot("./.cache/vite-local"),
  resolve: {
    alias: {
      "@": fromConfigRoot("./src")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 3000
  }
});
