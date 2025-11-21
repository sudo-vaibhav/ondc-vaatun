import { NextResponse } from 'next/server';
import { REQUEST_ID, SIGNING_PRIVATE_KEY, signMessage } from '@/lib/ondc-utils';

export async function GET() {
  try {
    // Sign the REQUEST_ID
    const signedContent = await signMessage(REQUEST_ID, SIGNING_PRIVATE_KEY);

    // HTML template with signed content
    const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta
      name="ondc-site-verification"
      content="${signedContent}"
    />
  </head>
  <body>
    ONDC Site Verification Page
  </body>
</html>`;

    // Return HTML response
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating verification page:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
