import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Prevent Next/webpack from bundling pino's worker-thread transports.
  // Without this, pino-pretty runs from a path inside .next/server/vendor-chunks
  // and the worker fails with "Cannot find module .../lib/worker.js".
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "pino-worker",
    "pino-pipeline-worker",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
