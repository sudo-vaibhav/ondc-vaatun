import crypto from "node:crypto";
import { URL } from "node:url";
import _sodium from "libsodium-wrappers";
import { z } from "zod";
import { Id } from "@/value-objects/id";
import { UUID } from "@/value-objects/uuid";

/**
 * ONDC:FIS13 is for insurance
 */
const ALLOWED_DOMAIN_CODES = ["ONDC:FIS13"] as const;
type AllowedDomainCode = (typeof ALLOWED_DOMAIN_CODES)[number];
/**
 * Zod schema for tenant environment variables
 */
const TenantEnvSchema = z.object({
  SUBSCRIBER_ID: z
    .string()
    .min(1, "Subscriber ID is required")
    .refine((val) => val.includes("."), {
      message: "Subscriber ID should be a domain name",
    }),

  DOMAIN_CODE: z.enum(ALLOWED_DOMAIN_CODES).default("ONDC:FIS13"),
  UNIQUE_KEY_ID: z.string().optional(),
  STATIC_SUBSCRIBE_REQUEST_ID: z
    .string()
    .min(1, "Subscribe Request ID is required")
    .transform((val) => new UUID(val)),
  ENCRYPTION_PRIVATE_KEY: z
    .string()
    .min(1, "Encryption private key is required")
    .refine(
      (val) => {
        try {
          Buffer.from(val, "base64");
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Encryption private key must be valid base64",
      },
    ),
  ENCRYPTION_PUBLIC_KEY: z.string().min(1, "Encryption public key is required"),
  ONDC_PUBLIC_KEY: z
    .string()
    .min(1, "ONDC public key is required")
    .refine(
      (val) => {
        try {
          Buffer.from(val, "base64");
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "ONDC public key must be valid base64",
      },
    ),
  SIGNING_PRIVATE_KEY: z
    .string()
    .min(1, "Signing private key is required")
    .refine(
      (val) => {
        try {
          Buffer.from(val, "base64");
          return true;
        } catch {
          return false;
        }
      },
      {
        message: "Signing private key must be valid base64",
      },
    ),
  SIGNING_PUBLIC_KEY: z.string().min(1, "Signing public key is required"),
  ONDC_REGISTRY_URL: z.url({
    protocol: /^https?$/,
    hostname: z.regexes.domain,
  }),
  ONDC_GATEWAY_URL: z.url({ protocol: /^https?$/, hostname: z.regexes.domain }),
});

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
  /**
   * Subscriber ID (domain name format)
   * */
  public readonly subscriberId: string;
  public readonly status: "active" | "inactive" | "suspended" = "active";
  public readonly uniqueKeyId: string;
  public readonly subscribeRequestId: UUID;
  public readonly gatewayUrl: URL;
  public readonly registryUrl: URL;
  /**
   * Adding for future use of whitelisted intermediary ID, in case multiple brokers are using this software
   */
  whitelistedIntermediaryId: Id = new Id("ondc-vaatun-intermediary");

  // Raw credentials (base64 encoded)
  private readonly encryptionPrivateKey: string;
  private readonly ondcPublicKey: string; // ONDC's public key (for verifying them)
  public readonly encryptionPublicKey: string; // OUR public key (for payload)
  private readonly signingPrivateKey: string;
  public readonly signingPublicKey: string; // OUR public key (for payload)

  // Computed cryptographic objects
  private readonly privateKeyObject: crypto.KeyObject;
  private readonly publicKeyObject: crypto.KeyObject;
  private readonly sharedSecret: Buffer;

  public readonly domainCode: AllowedDomainCode;
  /**
   * Private constructor - use getInstance() to get singleton instance
   */
  private constructor() {
    // Validate and load credentials from environment using Zod
    const env = TenantEnvSchema.parse(process.env);

    this.subscriberId = env.SUBSCRIBER_ID; // human friend unique identifier
    // uk id -> unique key id -> this is like a uuid equivalent identifier for subscriber id

    // unique key id: is for identifying the key pair

    // request id -> this is per request basis, i can change this. -> we are not using
    // this one right now.

    // request id -> used for ondc site verification -> stay same for the entire duration
    // unique key id -> stays same and needs to be passed for headers of request.

    this.uniqueKeyId = env.UNIQUE_KEY_ID || "custom-key-id"; // Default for development if not provided
    this.subscribeRequestId = env.STATIC_SUBSCRIBE_REQUEST_ID;
    this.encryptionPrivateKey = env.ENCRYPTION_PRIVATE_KEY;
    this.encryptionPublicKey = env.ENCRYPTION_PUBLIC_KEY;
    this.ondcPublicKey = env.ONDC_PUBLIC_KEY;
    this.signingPublicKey = env.SIGNING_PUBLIC_KEY;
    this.signingPrivateKey = env.SIGNING_PRIVATE_KEY;
    this.domainCode = env.DOMAIN_CODE;
    this.registryUrl = new URL(env.ONDC_REGISTRY_URL);
    this.gatewayUrl = new URL(env.ONDC_GATEWAY_URL);
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
          `Invalid shared secret length: ${this.sharedSecret.length} (expected 32 bytes for AES-256)`,
        );
      }

      console.log("[Tenant] Initialized successfully:", {
        subscriberId: this.subscriberId,
        subscribeRequestId: this.subscribeRequestId.value,
        sharedSecretLength: this.sharedSecret.length,
      });
    } catch (error) {
      console.error("[Tenant] Failed to initialize:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to initialize Tenant");
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
      const decipher = crypto.createDecipheriv(
        "aes-256-ecb",
        this.sharedSecret,
        iv,
      );
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
        sodium.from_base64(
          this.signingPrivateKey,
          _sodium.base64_variants.ORIGINAL,
        ),
      );

      const signature = sodium.to_base64(
        signedMessage,
        _sodium.base64_variants.ORIGINAL,
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
 * Don't use this directly
 * Helper function to get tenant instance
 * Use this in API routes and server components
 */
export function __internal_do_not_import_getTenant(): Tenant {
  return Tenant.getInstance();
}
