// implement the search ondc call

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTenant } from '@/entities/tenant';
import { ONDCClient } from '@/lib/ondc/client';
import { createSearchEntry } from '@/lib/searchStore';


export async function POST(request: NextRequest) {
    try {
        const tenant = getTenant();

        // Generate unique IDs for this search transaction
        const transactionId = uuidv4();
        const messageId = uuidv4();
        const categoryCode = "HEALTH_INSURANCE";

        // Create store entry to track responses
        createSearchEntry(transactionId, messageId, categoryCode);

        // Search payload with all mandatory fields (Owner: BAP)
        const payload = {
            context: {
                action: "search", // Beckn protocol method being called
                // BAP (Buyer Application Platform) details
                bap_id: tenant.subscriberId, // Subscriber ID of the BAP
                bap_uri: `https://${tenant.subscriberId}/api/ondc`, // Subscriber URL of the BAP for accepting callbacks
                // ONDC Domain details
                domain: "ONDC:FIS13", // Domain code relevant to this transaction context
                // Location details
                location: {
                    country: {
                        code: "IND" // Country code as per ISO 3166-1 and ISO 3166-2 format
                    },
                    city: {
                        code: "*" // City code this location is or is located within
                    }
                },
                // Transaction identifiers
                transaction_id: transactionId, // Unique value which persists across all API calls
                message_id: messageId, // Unique value which persists during a request/callback cycle

                // Timing details
                timestamp: new Date().toISOString(), // Time of request generation in RFC3339 format
                ttl: "PT5M", // Duration in ISO8601 format after timestamp for which message holds valid
                version: "2.0.1", // Version of transaction protocol being used
            },
            message: {
                intent: {
                    category: {
                        descriptor: {
                            code: "HEALTH_INSURANCE" // Type of insurance (health, marine, motor)
                        }
                    },
                    payment: {
                        collected_by: "BAP", // Indicates who is the collector of payment
                        tags: [
                            {
                                descriptor: {
                                    code: "BUYER_FINDER_FEES" // Describes Buyer finder fee
                                },
                                display: false,
                                list: [
                                    {
                                        descriptor: {
                                            code: "BUYER_FINDER_FEES_TYPE" // Buyer finder fee type
                                        },
                                        value: "percent-annualized"
                                    },
                                    {
                                        descriptor: {
                                            code: "BUYER_FINDER_FEES_PERCENTAGE" // Buyer finder fee percentage
                                        },
                                        value: "1"
                                    }
                                ]
                            },
                            {
                                descriptor: {
                                    code: "SETTLEMENT_TERMS" // Describes settlement terms
                                },
                                display: false,
                                list: [
                                    {
                                        descriptor: {
                                            code: "SETTLEMENT_WINDOW" // Settlement window
                                        },
                                        value: "PT60M"
                                    },
                                    {
                                        descriptor: {
                                            code: "SETTLEMENT_BASIS" // Settlement basis
                                        },
                                        value: "Delivery"
                                    },
                                    {
                                        descriptor: {
                                            code: "DELAY_INTEREST" // Delay interest
                                        },
                                        value: "2.5"
                                    },
                                    {
                                        descriptor: {
                                            code: "STATIC_TERMS" // Static terms URL
                                        },
                                        value: "https://bap.credit.becknprotocol.io/personal-banking/loans/personal-loan"
                                    },
                                    {
                                        descriptor: {
                                            code: "OFFLINE_CONTRACT" // Offline contract
                                        },
                                        value: "true"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        };

        const gatewayUrl = `${process.env.ONDC_GATEWAY_URL || 'https://staging.gateway.proteantech.in'}/search`;

        console.log('[Search] Sending request to:', gatewayUrl);
        console.log('[Search] Payload:', JSON.stringify(payload, null, 2));

        const response = await ONDCClient.send(gatewayUrl, 'POST', payload);

        console.log('[Search] ONDC Response:', JSON.stringify(response, null, 2));

        // Return transaction ID so frontend can poll for results
        return NextResponse.json({
            ...response,
            transactionId,
            messageId,
        });
    } catch (error) {
        console.error('[Search] Error:', error);
        return NextResponse.json(
            {
                status: 'Search FAIL',
                ready: false,
            },
            { status: 503 }
        );
    }
}
