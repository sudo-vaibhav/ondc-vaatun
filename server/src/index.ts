import "./tracing"; // MUST BE FIRST IMPORT

import ngrok from "@ngrok/ngrok";
import { app } from "./app";
import { logger } from "./lib/logger";

const PORT = process.env.PORT || 4822;
const NGROK_DOMAIN = process.env.SUBSCRIBER_ID;

app.listen(PORT, async () => {
  logger.info({ port: PORT }, "Server started");
  logger.info({ endpoint: `/api/trpc` }, "tRPC endpoint available");
  logger.info({ endpoint: `/health` }, "Health check available");
  logger.info({ endpoint: `/api/reference` }, "API docs available");

  // Start ngrok tunnel in non-production environments if authtoken is configured
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction && process.env.NGROK_AUTHTOKEN) {
    try {
      const listener = await ngrok.connect({
        addr: PORT,
        authtoken_from_env: true,
        domain: NGROK_DOMAIN,
      });
      logger.info({ url: listener.url() }, "ngrok tunnel established");
    } catch (err) {
      logger.error({ err }, "Failed to establish ngrok tunnel");
    }
  } else if (isProduction) {
    logger.info("ngrok skipped in production environment");
  }
});
