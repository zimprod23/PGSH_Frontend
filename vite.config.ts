import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    // process.env["services__pgsh-api__http__0"]
    // ||
    process.env["services__pgsh-api__https__0"];
  console.log("======================================================");

  console.log("API TARGET:", apiTarget);

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT),
      proxy: {
        // "apiservice" is the name of the API in AppHost.cs.
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      outDir: "dist",
      rollupOptions: {
        input: "./index.html",
      },
    },
  };
});
