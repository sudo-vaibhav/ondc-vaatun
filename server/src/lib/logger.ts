import { createRequire } from "node:module";

// Load pino via CJS require() so PinoInstrumentation (which uses
// require-in-the-middle) can intercept and patch it. ESM static imports
// bypass the instrumentation hooks entirely.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pino: typeof import("pino") = require("pino");
const pretty: typeof import("pino-pretty") = require("pino-pretty");

const isDevelopment = process.env.NODE_ENV !== "production";

// Use pino-pretty as a stream (not a transport) so PinoInstrumentation can
// inject the OTel log-sending multistream. The `transport` option spawns a
// worker thread which bypasses the instrumentation's stream patching.
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  },
  isDevelopment
    ? pretty({
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      })
    : pino.destination(),
);
