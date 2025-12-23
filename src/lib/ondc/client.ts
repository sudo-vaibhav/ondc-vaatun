import { createAuthorizationHeader } from './signing';

interface ONDCResponse<T> {
    message?: {
        ack: {
            status: 'ACK' | 'NACK';
        };
    };
    error?: {
        code: string;
        message: string;
    };
    [key: string]: any;
}

/**
 * Validated ONDC API Client
 * Automatically handles request signing and standard headers
 */
export class ONDCClient {
    /**
     * Send a signed request to an ONDC network participant
     * 
     * @param url - Full URL of the target endpoint (e.g. "https://seller-app.com/on_search")
     * @param method - HTTP Method (usually POST)
     * @param body - The Full JSON body of the request
     * @returns The parsed JSON response
     */
    static async send<T = any>(
        url: string,
        method: 'POST',
        body: any
    ): Promise<T> {
        try {
            // 1. Generate the ONDC Authorization Header
            const authHeader = await createAuthorizationHeader(body);

            // 2. Make the request
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    // ONDC specific headers if needed, though usually Auth is sufficient
                },
                body: JSON.stringify(body),
            });

            // 3. Handle Network/HTTP Errors
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ONDC Request Failed [${response.status}]: ${errorText}`);
            }

            // 4. Parse Response
            const data = await response.json();
            return data as T;

        } catch (error) {
            console.error(`[ONDCClient] Error sending to ${url}:`, error);
            throw error;
        }
    }

    /**
     * Helper specifically for ACK responses
     * Most ONDC async calls return a simple ACK immediately
     */
    static async sendWithAck(url: string, body: any): Promise<boolean> {
        const response = await this.send<ONDCResponse<any>>(url, 'POST', body);
        return response.message?.ack?.status === 'ACK';
    }
}
