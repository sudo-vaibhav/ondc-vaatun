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
