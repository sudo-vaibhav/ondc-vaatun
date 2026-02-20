import { Router } from "express";
import { Tenant } from "../entities/tenant";
import { logger } from "../lib/logger";

export const siteVerificationRouter: Router = Router();

/**
 * Site verification endpoint for ONDC domain verification
 * GET /ondc-site-verification.html
 */
siteVerificationRouter.get("/ondc-site-verification.html", (_req, res) => {
  try {
    const tenant = Tenant.getInstance();
    const signature = tenant.signSubscribeRequestId();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ondc-site-verification" content="${signature}">
    <title>ONDC Site Verification</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 { color: #333; }
        .success { color: #22c55e; }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>ONDC Site Verification</h1>
    <p class="success">✓ This page is for ONDC domain verification.</p>
    <p>Subscriber ID: <code>${tenant.subscriberId}</code></p>
    <p>Request ID: <code>${tenant.subscribeRequestId.value}</code></p>
    <p>The signature is embedded in the meta tag of this page.</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    logger.error({ err: error as Error }, "Site verification error");
    res.status(500).send("Error generating verification page");
  }
});
