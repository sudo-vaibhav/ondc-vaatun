import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "ONDC x Vaatun - Open Network for Digital Commerce Integration";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        backgroundImage:
          "radial-gradient(circle at 25px 25px, #f5f5f5 2%, transparent 0%), radial-gradient(circle at 75px 75px, #f5f5f5 2%, transparent 0%)",
        backgroundSize: "100px 100px",
      }}
    >
      {/* Main content container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          textAlign: "center",
        }}
      >
        {/* ONDC x Vaatun branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              background:
                "linear-gradient(135deg, oklch(0.6489 0.2370 26.9728) 0%, oklch(0.5635 0.2408 260.8178) 100%)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
              letterSpacing: "-0.02em",
            }}
          >
            ONDC
          </div>
          <div
            style={{
              fontSize: "72px",
              color: "#a3a3a3",
              display: "flex",
            }}
          >
            ×
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              background:
                "linear-gradient(135deg, oklch(0.9680 0.2110 109.7692) 0%, oklch(0.7044 0.1872 23.1858) 100%)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
              letterSpacing: "-0.02em",
            }}
          >
            Vaatun
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "32px",
            color: "#404040",
            maxWidth: "900px",
            lineHeight: "1.4",
            marginBottom: "20px",
            display: "flex",
          }}
        >
          Open Network for Digital Commerce Integration
        </div>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "32px",
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "oklch(0.95 0.05 26.9728)",
              border: "2px solid oklch(0.6489 0.2370 26.9728)",
              borderRadius: "0px",
              fontSize: "20px",
              color: "oklch(0.4 0.2 26.9728)",
              display: "flex",
            }}
          >
            API Integration
          </div>
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "oklch(0.95 0.05 260.8178)",
              border: "2px solid oklch(0.5635 0.2408 260.8178)",
              borderRadius: "0px",
              fontSize: "20px",
              color: "oklch(0.4 0.2 260.8178)",
              display: "flex",
            }}
          >
            TypeScript
          </div>
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "oklch(0.95 0.05 109.7692)",
              border: "2px solid oklch(0.9680 0.2110 109.7692)",
              borderRadius: "0px",
              fontSize: "20px",
              color: "oklch(0.5 0.15 109.7692)",
              display: "flex",
            }}
          >
            Cryptography
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          fontSize: "18px",
          color: "#737373",
          display: "flex",
        }}
      >
        Subscription Verification • Domain Ownership • API Integration
      </div>
    </div>,
    {
      ...size,
    },
  );
}
