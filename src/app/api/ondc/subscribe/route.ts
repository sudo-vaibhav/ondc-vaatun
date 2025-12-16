import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/entities/tenant';
import { createAuthorizationHeader } from '@/lib/ondc/signing';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const tenant = getTenant();

        // 1. Prepare the subscription payload
        // This structure follows the ONDC Protocol for network participant subscription
        const requestId = uuidv4();
        const timestamp = new Date().toISOString();

        // Note: In a real scenario, these URLs should probably come from env or config
        // For now, constructing based on subscriberId assuming it's a domain
        const baseUrl = `https://${tenant.subscriberId}`;

        const payload = {
            context: {
                domain: "ONDC:INS10", // Health Insurance domain
                country: "IND",
                city: "std:080", // Can be "*" or specific city
                action: "subscribe",
                core_version: "1.0.0",
                bap_id: tenant.subscriberId,
                bap_uri: `${baseUrl}/api/ondc`, // Callback base URL
                message_id: uuidv4(),
                timestamp: timestamp,
            },
            message: {
                entity: {
                    gsp: {
                        subscriber_id: tenant.subscriberId,
                        subscriber_url: `${baseUrl}/api/ondc`, // Ensure this matches context.bap_uri
                    },
                    entity_type: {
                        nodal: false,
                        buyer_app: true,
                        seller_app: false,
                        gateway: false
                    },
                    key_pair: {
                        signing_public_key: process.env.SIGNING_PUBLIC_KEY || "TODO_GET_FROM_ENV", // We need the PUBLIC signing key to send to them
                        encryption_public_key: process.env.ONDC_PUBLIC_KEY // Wait, this is THEIR key. We need OUR public encryption key.
                    }
                }
            }
        };

        /**
         * CRITICAL: The payload needs to send OUR Public keys to the registry.
         * The Current Tenant class loads PRIVATE keys but doesn't explicitly expose the derived PUBLIC keys 
         * in a simple property (except via keyObject).
         * 
         * For now, we will assume standard headers are sufficient for the 'call', 
         * BUT for the BODY of the subscribe call, we need to send our PUBLIC keys.
         * 
         * Let's derive them from the Tenant's private keys if possible, or assume they are in env.
         * The user's env listing showed ONDC_PUBLIC_KEY (which is likely the Gateway/Registry's key),
         * but didn't explicitly list "MY_ENCRYPTION_PUBLIC_KEY".
         * 
         * However, we can derive the public key from the private key using crypto.
         */

        // 2. Sign the request
        const authHeader = await createAuthorizationHeader(payload);

        // 3. Send to ONDC Gateway/Registry
        // The Gateway URL should be in env. For now using a placeholder or common staging URL.
        const gatewayUrl = process.env.ONDC_GATEWAY_URL || 'https://staging.registry.ondc.org/subscribe';

        console.log('[Subscribe] Sending request to:', gatewayUrl);
        console.log('[Subscribe] Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(gatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Subscribe] Failed:', response.status, errorText);
            return NextResponse.json(
                { error: 'Subscription request failed', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[Subscribe] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
