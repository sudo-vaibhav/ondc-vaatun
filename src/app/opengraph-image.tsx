import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'ONDC x Vaatun - Open Network for Digital Commerce Integration';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #f5f5f5 2%, transparent 0%), radial-gradient(circle at 75px 75px, #f5f5f5 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        {/* Main content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px',
            textAlign: 'center',
          }}
        >
          {/* ONDC x Vaatun branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
                letterSpacing: '-0.02em',
              }}
            >
              ONDC
            </div>
            <div
              style={{
                fontSize: '72px',
                color: '#a3a3a3',
                display: 'flex',
              }}
            >
              ×
            </div>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #ec4899 0%, #f59e0b 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                display: 'flex',
                letterSpacing: '-0.02em',
              }}
            >
              Vaatun
            </div>
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: '32px',
              color: '#404040',
              maxWidth: '900px',
              lineHeight: '1.4',
              marginBottom: '20px',
              display: 'flex',
            }}
          >
            Open Network for Digital Commerce Integration
          </div>

          {/* Tags */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '32px',
            }}
          >
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                fontSize: '20px',
                color: '#60a5fa',
                display: 'flex',
              }}
            >
              Next.js 16
            </div>
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                border: '2px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '8px',
                fontSize: '20px',
                color: '#a78bfa',
                display: 'flex',
              }}
            >
              TypeScript
            </div>
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                border: '2px solid rgba(236, 72, 153, 0.3)',
                borderRadius: '8px',
                fontSize: '20px',
                color: '#f472b6',
                display: 'flex',
              }}
            >
              Cryptography
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '18px',
            color: '#737373',
            display: 'flex',
          }}
        >
          Subscription Verification • Domain Ownership • API Integration
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
