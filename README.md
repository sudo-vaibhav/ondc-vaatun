# ONDC Vaatun

A Next.js application for integrating with the Open Network for Digital Commerce (ONDC) platform. This service handles ONDC subscription verification, message signing, and provides the necessary endpoints for ONDC network participation.

## What is ONDC?

[ONDC (Open Network for Digital Commerce)](https://ondc.org/) is an initiative by the Government of India to democratize digital commerce by creating an open, interoperable network. It enables buyers and sellers to transact regardless of the platform they use.

## Features

- **ONDC Subscription Endpoint** - Handle challenge-response verification for ONDC network subscription
- **Site Verification** - Serve signed verification page for domain ownership
- **Health Check** - Monitor service availability
- **Secure Key Management** - Environment-based configuration for sensitive keys
- **TypeScript** - Full type safety throughout the application
- **Next.js App Router** - Modern Next.js 15+ architecture

## Prerequisites

- Node.js 18+
- npm or yarn
- ONDC credentials (encryption keys, signing keys)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ondc-vaatun
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Add your ONDC credentials to `.env`:
```env
ENCRYPTION_PRIVATE_KEY=your_encryption_private_key_here
ONDC_PUBLIC_KEY=your_ondc_public_key_here
REQUEST_ID=your_request_id_here
SIGNING_PRIVATE_KEY=your_signing_private_key_here
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ENCRYPTION_PRIVATE_KEY` | Your X25519 private key for encryption (base64) | `MC4CAQAwBQYD...` |
| `ONDC_PUBLIC_KEY` | ONDC's public key for your environment (base64) | `MCowBQYDK2Vu...` |
| `REQUEST_ID` | Unique request ID for site verification | `019aa6d1-8906-...` |
| `SIGNING_PRIVATE_KEY` | Ed25519 private key for signing (base64) | `gjMvb5yp77UV...` |

## Running the Application

### Development
```bash
npm run dev
```
The application will start at [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

### Code Quality
```bash
npm run lint      # Check code quality
npm run format    # Format code with Biome
```

## API Endpoints

### 1. ONDC Subscription Endpoint

**POST** `/api/ondc/on_subscribe`

Handles ONDC subscription challenge-response verification.

**Request:**
```json
{
  "subscriber_id": "ondc-buyer-staging-app.yash.com",
  "challenge": "encrypted_challenge_string"
}
```

**Response:**
```json
{
  "answer": "decrypted_challenge_string"
}
```

**How it works:**
1. ONDC sends an encrypted challenge using AES-256-ECB
2. The endpoint decrypts it using the Diffie-Hellman shared secret
3. Returns the decrypted answer to verify successful subscription

### 2. Site Verification

**GET** `/ondc-site-verification.html`

Serves HTML page with signed meta tag for domain verification.

**Response:**
```html
<html>
  <head>
    <meta name="ondc-site-verification" content="SIGNED_REQUEST_ID" />
  </head>
  <body>
    ONDC Site Verification Page
  </body>
</html>
```

### 3. Health Check

**GET** `/api/ondc/health`

Check service health status.

**Response:**
```json
{
  "status": "Health OK!!"
}
```

## Testing the Endpoints

### Test Health Check
```bash
curl http://localhost:3000/api/ondc/health
```

### Test Site Verification
```bash
curl http://localhost:3000/ondc-site-verification.html
```

### Test Subscription Endpoint
```bash
curl -X POST http://localhost:3000/api/ondc/on_subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "test-subscriber",
    "challenge": "your_encrypted_challenge_here"
  }'
```

## ONDC Subscription Process

To subscribe to the ONDC network:

1. **Configure Environment Variables** - Add your ONDC keys to `.env`
2. **Deploy Your Service** - Make sure it's publicly accessible
3. **Set Up Site Verification** - Ensure `/ondc-site-verification.html` is accessible
4. **Register with ONDC** - Submit your subscriber details to ONDC
5. **Challenge-Response** - ONDC will call `/api/ondc/on_subscribe` with an encrypted challenge
6. **Verification** - If decryption succeeds, you're subscribed to the network

## Project Structure

```
ondc-vaatun/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ondc/
│   │   │       ├── on_subscribe/
│   │   │       │   └── route.ts         # Subscription endpoint
│   │   │       └── health/
│   │   │           └── route.ts         # Health check endpoint
│   │   ├── ondc-site-verification.html/
│   │   │   └── route.ts                 # Verification page
│   │   ├── layout.tsx                   # Root layout
│   │   └── page.tsx                     # Home page
│   └── lib/
│       └── ondc-utils.ts                # Encryption, signing utilities
├── .env                                 # Environment variables (not in git)
├── .env.example                         # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Our Subscriber IDs

### Staging Environment

- **Subscriber ID**: `ondc-staging.vaatun.com`
- **Seeding Request ID**: `019aa6d1-8906-704b-9929-64be78bb83cc`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

Ensure your deployment platform supports:
- Node.js 18+
- Environment variables
- HTTPS (required by ONDC)

## Security Notes

- Never commit `.env` file to version control
- Keep your private keys secure
- Use different keys for staging and production
- Rotate keys periodically
- Monitor your endpoints for unauthorized access

## Tech Stack

- **Framework**: Next.js 15+
- **Runtime**: Node.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Code Quality**: Biome
- **Cryptography**: Node.js crypto, libsodium-wrappers

## Resources

- [ONDC Official Website](https://ondc.org/)
- [ONDC Documentation](https://docs.ondc.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [ONDC Developer Guide](https://github.com/ONDC-Official/developer-docs)

## License

[Your License Here]

## Support

For issues and questions, please contact [your-email@example.com]
