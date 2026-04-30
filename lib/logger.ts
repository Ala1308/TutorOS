import pino, { type LoggerOptions } from "pino";

import { env } from "@/lib/env";

const isDev = env.NODE_ENV !== "production";
// Worker-thread transports (pino-pretty) don't play well with Next.js's
// bundler in some runtimes (edge/turbopack, or when packages get bundled
// into .next/server/vendor-chunks). Allow disabling via env if needed.
const enablePretty = isDev && process.env.DISABLE_PINO_PRETTY !== "1";

const baseOptions: LoggerOptions = {
  level: isDev ? "debug" : "info",
  base: {
    service: "tutoros",
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.token",
      "*.authorization",
      "*.cookie",
      "*.apiKey",
      "*.api_key",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
};

function createLogger() {
  if (!enablePretty) return pino(baseOptions);
  try {
    return pino({
      ...baseOptions,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
      },
    });
  } catch {
    return pino(baseOptions);
  }
}

export const logger = createLogger();

export type Logger = typeof logger;
