// implement the search ondc call

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {


        // Search payload with all mandatory fields (Owner: BAP)
        const payload = {
            context: {
                // Location details
                location: {
                    country: {
                        code: "IND" // Country code as per ISO 3166-1 and ISO 3166-2 format
                    },
                    city: {
                        code: "*" // City code this location is or is located within
                    }
                },
                // Domain and protocol details
                domain: "ONDC:FIS13", // Domain code relevant to this transaction context
                action: "search", // Beckn protocol method being called
                version: "2.0.1", // Version of transaction protocol being used

                // BAP (Buyer Application Platform) details
                bap_id: "fis.test.bap.io", // Subscriber ID of the BAP
                bap_uri: "https://fis.test.bap.io/", // Subscriber URL of the BAP for accepting callbacks

                // Transaction identifiers
                transaction_id: "6743e9e2", // Unique value which persists across all API calls
                message_id: "13ba9018f176", // Unique value which persists during a request/callback cycle

                // Timing details
                timestamp: "2023-03-23T04:41:16Z", // Time of request generation in RFC3339 format
                ttl: "PT30S" // Duration in ISO8601 format after timestamp for which message holds valid
            },
            message: {
                intent: {
                    category: {
                        descriptor: {
                            code: "HEALTH_INSURANCE" // Type of insurance (health, marine, motor)
                        }
                    },
                    payment: {
                        collected_by: "BPP", // Indicates who is the collector of payment
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



        return NextResponse.json(
            {
                status: 'Health OK!!',
                ready: true,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[health] Service not ready:', error);
        return NextResponse.json(
            {
                status: 'Health FAIL',
                ready: false,
            },
            { status: 503 }
        );
    }
}
