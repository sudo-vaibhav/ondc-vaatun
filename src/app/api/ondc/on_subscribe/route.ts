import { NextRequest, NextResponse } from 'next/server';
import { sharedKey, decryptAES256ECB } from '@/lib/ondc-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challenge } = body;

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      );
    }

    // Decrypt the challenge using AES-256-ECB
    const answer = decryptAES256ECB(sharedKey, challenge);

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    console.error('Error processing on_subscribe:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
