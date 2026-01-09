import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      new URL("https://www.bajajallianz.com/content/dam/bagic/gili/**"),
      new URL("https://oicl-cms-media.s3.ap-south-1.amazonaws.com/**"),
      new URL(
        "https://www.abcinsurance.com/content/dam/abc/india/assets/images/**",
      ),
      new URL("https://usgi.ai/JanSurakshaPortal/images/**"),
      new URL(
        "https://www.autoconinsurance.com/content/dam/autocon/india/assets/**",
      ),
    ],
  },
  allowedDevOrigins: ["moved-starfish-rapid.ngrok-free.app"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://*.prishapolicy.com https://prishapolicy.com https://*.vaatun.com https://vaatun.com https://*.vantage.vaatun.com https://ondc-staging.vaatun.com http://localhost:3000 http://localhost:4200",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
