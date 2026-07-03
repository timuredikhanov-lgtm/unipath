import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // гарантируем что файлы промтов попадают в serverless bundle на Vercel
  outputFileTracingIncludes: {
    "/api/chat": ["./prompts/**/*"],
  },
};

export default nextConfig;
