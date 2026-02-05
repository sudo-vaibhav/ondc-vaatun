import ngrok from "@ngrok/ngrok";
import { app } from "./app";

const PORT = process.env.PORT || 4822;
const NGROK_DOMAIN = process.env.SUBSCRIBER_ID;

app.listen(PORT, async () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] API docs: http://localhost:${PORT}/api/reference`);

  // Start ngrok tunnel in non-production environments if authtoken is configured
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction && process.env.NGROK_AUTHTOKEN) {
    try {
      const listener = await ngrok.connect({
        addr: PORT,
        authtoken_from_env: true,
        domain: NGROK_DOMAIN,
      });
      console.log(`[ngrok] Tunnel established at: ${listener.url()}`);
    } catch (err) {
      console.error("[ngrok] Failed to establish tunnel:", err);
    }
  } else if (isProduction) {
    console.log("[ngrok] Skipped in production environment");
  }
});
