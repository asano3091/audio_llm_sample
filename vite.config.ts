import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  // GitHub Pages のリポジトリ名に合わせる（例: audio_llm_sample）
  const REPO_NAME = "audio_llm_sample";

  return {
    base: `/${REPO_NAME}/`,

    server: {
      port: 3000,
      host: "0.0.0.0",
    },

    plugins: [react()],

    define: {
      "process.env.API_KEY": '""',
      "process.env.GEMINI_API_KEY": '""',
      "import.meta.env.GEMINI_API_KEY": '""',
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
