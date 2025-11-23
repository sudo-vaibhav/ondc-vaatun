import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/entities/tenant';

export async function POST(request: NextRequest) {
  try {
    const tenant = getTenant();
    const body = await request.json();
    const { challenge, subscriber_id } = body;

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge is required' },
        { status: 400 }
      );
    }

    // Optional: Validate subscriber_id matches tenant
    if (subscriber_id && subscriber_id !== tenant.subscriberId) {
      console.warn('[on_subscribe] Subscriber ID mismatch:', {
        expected: tenant.subscriberId,
        received: subscriber_id,
      });
    }

    // Decrypt the challenge using tenant's credentials
    const answer = tenant.decryptChallenge(challenge);

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    console.error('[on_subscribe] Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
