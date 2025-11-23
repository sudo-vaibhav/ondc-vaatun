import crypto from "crypto";
import _sodium from "libsodium-wrappers";
import { z } from "zod";
import { UUID } from "@/value-objects/uuid";

/**
 * Zod schema for tenant environment variables
 */
const TenantEnvSchema = z.object({
  SUBSCRIBER_ID: z.string()
    .min(1, "Subscriber ID is required")
    .refine((val) => val.includes("."), {
      message: "Subscriber ID should be a domain name",
    }),
  STATIC_SUBSCRIBE_REQUEST_ID: z.string()
    .min(1, "Subscribe Request ID is required")
    .transform((val) => new UUID(val)),
  ENCRYPTION_PRIVATE_KEY: z.string()
    .min(1, "Encryption private key is required")
    .refine((val) => {
      try {
        Buffer.from(val, "base64");
        return true;
      } catch {
        return false;
      }
    }, {
      message: "Encryption private key must be valid base64",
    }),
  ONDC_PUBLIC_KEY: z.string()
    .min(1, "ONDC public key is required")
    .refine((val) => {
      try {
        Buffer.from(val, "base64");
        return true;
      } catch {
        return false;
      }
    }, {
      message: "ONDC public key must be valid base64",
    }),
  SIGNING_PRIVATE_KEY: z.string()
    .min(1, "Signing private key is required")
    .refine((val) => {
      try {
        Buffer.from(val, "base64");
        return true;
      } catch {
        return false;
      }
    }, {
      message: "Signing private key must be valid base64",
    }),
});

type TenantEnv = z.infer<typeof TenantEnvSchema>;

/**
 * Tenant Entity - Encapsulates all ONDC credentials and cryptographic operations
 *
 * This class manages sensitive credentials for ONDC integration including:
 * - Encryption keys (X25519)
 * - Signing keys (Ed25519)
 * - Subscriber identification
 * - Pre-computed cryptographic secrets
 *
 * @example
 * ```typescript
 * const tenant = Tenant.getInstance();
 * const decrypted = tenant.decryptChallenge(encryptedChallenge);
 * const signature = await tenant.signMessage(message);
 * ```
 */
export class Tenant {
  private static instance: Tenant | null = null;

  // Identity
  public readonly subscriberId: string;
  public readonly subscribeRequestId: UUID;

  // Raw credentials (base64 encoded)
  private readonly encryptionPrivateKey: string;
  private readonly ondcPublicKey: string;
  private readonly signingPrivateKey: string;

  // Computed cryptographic objects
  private readonly privateKeyObject: crypto.KeyObject;
  private readonly publicKeyObject: crypto.KeyObject;
  private readonly sharedSecret: Buffer;

  /**
   * Private constructor - use getInstance() to get singleton instance
   */
  private constructor() {
    // Validate and load credentials from environment using Zod
    const env: TenantEnv = TenantEnvSchema.parse({
      SUBSCRIBER_ID: process.env.SUBSCRIBER_ID,
      STATIC_SUBSCRIBE_REQUEST_ID: process.env.STATIC_SUBSCRIBE_REQUEST_ID,
      ENCRYPTION_PRIVATE_KEY: process.env.ENCRYPTION_PRIVATE_KEY,
      ONDC_PUBLIC_KEY: process.env.ONDC_PUBLIC_KEY,
      SIGNING_PRIVATE_KEY: process.env.SIGNING_PRIVATE_KEY,
    });

    this.subscriberId = env.SUBSCRIBER_ID;
    this.subscribeRequestId = env.STATIC_SUBSCRIBE_REQUEST_ID;
    this.encryptionPrivateKey = env.ENCRYPTION_PRIVATE_KEY;
    this.ondcPublicKey = env.ONDC_PUBLIC_KEY;
    this.signingPrivateKey = env.SIGNING_PRIVATE_KEY;

    // Pre-compute cryptographic objects for performance
    try {
      this.privateKeyObject = crypto.createPrivateKey({
        key: Buffer.from(this.encryptionPrivateKey, "base64"),
        format: "der",
        type: "pkcs8",
      });

      this.publicKeyObject = crypto.createPublicKey({
        key: Buffer.from(this.ondcPublicKey, "base64"),
        format: "der",
        type: "spki",
      });

      // Calculate shared secret using Diffie-Hellman
      this.sharedSecret = crypto.diffieHellman({
        privateKey: this.privateKeyObject,
        publicKey: this.publicKeyObject,
      });

      // Validate shared secret length (should be 32 bytes for AES-256)
      if (this.sharedSecret.length !== 32) {
        throw new Error(
          `Invalid shared secret length: ${this.sharedSecret.length} (expected 32 bytes for AES-256)`
        );
      }

      console.log("[Tenant] Initialized successfully:", {
        subscriberId: this.subscriberId,
        subscribeRequestId: this.subscribeRequestId.value,
        sharedSecretLength: this.sharedSecret.length,
      });
    } catch (error) {
      console.error("[Tenant] Failed to initialize:", error);
      throw error instanceof Error ? error : new Error("Failed to initialize Tenant");
    }
  }

  /**
   * Get singleton instance of Tenant
   */
  public static getInstance(): Tenant {
    if (!Tenant.instance) {
      Tenant.instance = new Tenant();
    }
    return Tenant.instance;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    Tenant.instance = null;
  }

  /**
   * Decrypt ONDC challenge using AES-256-ECB
   *
   * @param encryptedChallenge - Base64 encoded encrypted challenge from ONDC
   * @returns Decrypted plaintext challenge
   */
  public decryptChallenge(encryptedChallenge: string): string {
    try {
      const iv = Buffer.alloc(0); // ECB mode doesn't use IV
      const decipher = crypto.createDecipheriv("aes-256-ecb", this.sharedSecret, iv);
      let decrypted = decipher.update(encryptedChallenge, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("[Tenant] Decryption failed:", error);
      throw new Error("Failed to decrypt challenge");
    }
  }

  /**
   * Sign a message using Ed25519 (libsodium)
   *
   * @param message - Message to sign
   * @returns Base64 encoded signature
   */
  public async signMessage(message: string): Promise<string> {
    try {
      await _sodium.ready;
      const sodium = _sodium;

      const signedMessage = sodium.crypto_sign_detached(
        message,
        sodium.from_base64(this.signingPrivateKey, _sodium.base64_variants.ORIGINAL)
      );

      const signature = sodium.to_base64(
        signedMessage,
        _sodium.base64_variants.ORIGINAL
      );

      return signature;
    } catch (error) {
      console.error("[Tenant] Signing failed:", error);
      throw new Error("Failed to sign message");
    }
  }

  /**
   * Sign the subscribe request ID for domain verification
   *
   * @returns Base64 encoded signature of STATIC_SUBSCRIBE_REQUEST_ID
   */
  public async signSubscribeRequestId(): Promise<string> {
    return this.signMessage(this.subscribeRequestId.value);
  }
}

/**
 * Helper function to get tenant instance
 * Use this in API routes and server components
 */
export function getTenant(): Tenant {
  return Tenant.getInstance();
}
