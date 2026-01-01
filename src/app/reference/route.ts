/**
 * OpenAPI Reference Route - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * This route previously served interactive API documentation via Scalar.
 * If you need API documentation, consider writing a manual OpenAPI spec
 * or using a different documentation approach.
 */

/*
import { ApiReference } from "@scalar/nextjs-api-reference";

const config: Parameters<typeof ApiReference>[0] = {
  url: "/openapi.json",
  theme: "elysiajs",
  layout: "modern",
  hideModels: false,
  hideDownloadButton: false,
  darkMode: true,
  forceDarkModeState: "dark",
};

export const GET = ApiReference(config);
*/

import { NextResponse } from "next/server";

export const GET = () => {
  return NextResponse.json(
    {
      message: "OpenAPI documentation is disabled",
      reason:
        "The zod-to-openapi integration was not working in a type-safe way with Zod v4",
    },
    { status: 410 },
  );
};
