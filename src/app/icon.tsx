import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, oklch(0.6489 0.2370 26.9728) 0%, oklch(0.5635 0.2408 260.8178) 100%)',
          borderRadius: '6px',
        }}
      >
        {/* Globe SVG Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Circle */}
          <circle cx="12" cy="12" r="10" />
          {/* Vertical ellipse */}
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          {/* Horizontal lines */}
          <path d="M2 12h20" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
