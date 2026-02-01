import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { apiReference } from "@scalar/express-api-reference";
import { appRouter } from "./trpc";
import { createContext } from "./trpc/context";
import { sseRouter } from "./routes/sse";
import { siteVerificationRouter } from "./routes/site-verification";
import { ondcCompatRouter } from "./routes/ondc-compat";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// CORS - must come before routes
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "development"
        ? "http://localhost:4823"
        : process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
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
  })
);

// OpenAPI documentation
app.use(
  "/api/reference",
  apiReference({
    theme: "purple",
    spec: {
      url: "/openapi.json",
    },
  })
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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Server Error]", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export { app };
