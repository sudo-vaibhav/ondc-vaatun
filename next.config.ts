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
    ],
  },
  allowedDevOrigins: ["moved-starfish-rapid.ngrok-free.app"],
};

export default nextConfig;
