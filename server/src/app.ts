import { apiReference } from "@scalar/express-api-reference";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { ondcCompatRouter } from "./routes/ondc-compat";
import { siteVerificationRouter } from "./routes/site-verification";
import { sseRouter } from "./routes/sse";
import { appRouter } from "./trpc";
import { createContext } from "./trpc/context";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// CORS - must come before routes
// In development, allow localhost and ngrok subscriber URL
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:4823");
    // Allow ngrok URL if configured
    if (process.env.SUBSCRIBER_ID) {
      origins.push(`https://${process.env.SUBSCRIBER_ID}`);
    }
  } else if (process.env.CLIENT_URL) {
    origins.push(process.env.CLIENT_URL);
  }

  return origins;
};

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = getAllowedOrigins();
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "Health OK!!", ready: true });
});

// JSON parsing with 10mb limit for ONDC payloads
app.use(express.json({ limit: "10mb" }));

// Site verification endpoint (serves HTML)
app.use(siteVerificationRouter);

// ONDC compatibility routes (REST API for backwards compatibility)
app.use("/api/ondc", ondcCompatRouter);

// SSE streaming endpoints (raw Express, not tRPC)
app.use("/api/ondc", sseRouter);

// tRPC routes
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// OpenAPI documentation
app.use(
  "/api/reference",
  apiReference({
    theme: "purple",
    spec: {
      url: "/openapi.json",
    },
  }),
);

// Serve OpenAPI spec
app.get("/openapi.json", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/openapi.json"));
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const publicPath = path.join(__dirname, "../public");
  app.use(express.static(publicPath));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

// Global error handler - must be last middleware
// biome-ignore lint/suspicious/noExplicitAny: Express error handler signature
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("[Server Error]", err);

    // If headers already sent, delegate to Express's default handler
    if (res.headersSent) {
      return next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  },
);

export { app };
