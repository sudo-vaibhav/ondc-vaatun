import crypto from "node:crypto";
import { URL } from "node:url";
import { z } from "zod";
import { Id } from "../value-objects/id";
import { UUID } from "../value-objects/uuid";

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
  STATIC_UNIQUE_KEY_ID: z.string().min(1, "Unique Key ID is required"),
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
      }
    ),
  ENCRYPTION_PUBLIC_KEY: z
    .string()
    .min(1, "Encryption public key is required"),
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
      }
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
      }
    ),
  SIGNING_PUBLIC_KEY: z.string().min(1, "Signing public key is required"),
  ONDC_REGISTRY_URL: z.string().url(),
  ONDC_GATEWAY_URL: z.string().url(),
});

/**
 * Tenant Entity - Encapsulates all ONDC credentials and cryptographic operations
 */
export class Tenant {
  private static instance: Tenant | null = null;

  public readonly subscriberId: string;
  public readonly status: "active" | "inactive" | "suspended" = "active";
  public readonly uniqueKeyId: Id;
  public readonly subscribeRequestId: UUID;
  public readonly gatewayUrl: URL;
  public readonly registryUrl: URL;
  whitelistedIntermediaryId: Id = new Id("ondc-vaatun-intermediary");

  private readonly encryptionPrivateKey: string;
  private readonly ondcPublicKey: string;
  public readonly encryptionPublicKey: string;
  private readonly signingPrivateKey: string;
  public readonly signingPublicKey: string;

  private readonly privateKeyObject: crypto.KeyObject;
  private readonly publicKeyObject: crypto.KeyObject;
  private readonly sharedSecret: Buffer;

  public readonly domainCode: AllowedDomainCode;

  private constructor() {
    const env = TenantEnvSchema.parse(process.env);

    this.subscriberId = env.SUBSCRIBER_ID;
    this.uniqueKeyId = new Id(env.STATIC_UNIQUE_KEY_ID);
    this.subscribeRequestId = env.STATIC_SUBSCRIBE_REQUEST_ID;
    this.encryptionPrivateKey = env.ENCRYPTION_PRIVATE_KEY;
    this.encryptionPublicKey = env.ENCRYPTION_PUBLIC_KEY;
    this.ondcPublicKey = env.ONDC_PUBLIC_KEY;
    this.signingPublicKey = env.SIGNING_PUBLIC_KEY;
    this.signingPrivateKey = env.SIGNING_PRIVATE_KEY;
    this.domainCode = env.DOMAIN_CODE;
    this.registryUrl = new URL(env.ONDC_REGISTRY_URL);
    this.gatewayUrl = new URL(env.ONDC_GATEWAY_URL);

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

      this.sharedSecret = crypto.diffieHellman({
        privateKey: this.privateKeyObject,
        publicKey: this.publicKeyObject,
      });

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
      throw error instanceof Error
        ? error
        : new Error("Failed to initialize Tenant");
    }
  }

  public static getInstance(): Tenant {
    if (!Tenant.instance) {
      Tenant.instance = new Tenant();
    }
    return Tenant.instance;
  }

  public static resetInstance(): void {
    Tenant.instance = null;
  }

  public decryptChallenge(encryptedChallenge: string): string {
    try {
      const iv = Buffer.alloc(0);
      const decipher = crypto.createDecipheriv(
        "aes-256-ecb",
        this.sharedSecret,
        iv
      );
      let decrypted = decipher.update(encryptedChallenge, "base64", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      console.error("[Tenant] Decryption failed:", error);
      throw new Error("Failed to decrypt challenge");
    }
  }

  public signMessage(message: string): string {
    try {
      const rawKey = Buffer.from(this.signingPrivateKey, "base64");

      const privateKey = crypto.createPrivateKey({
        key: Buffer.concat([
          Buffer.from("302e020100300506032b657004220420", "hex"),
          rawKey.subarray(0, 32),
        ]),
        format: "der",
        type: "pkcs8",
      });

      const signature = crypto.sign(null, Buffer.from(message), privateKey);

      return signature.toString("base64");
    } catch (error) {
      console.error("[Tenant] Signing failed:", error);
      throw new Error("Failed to sign message");
    }
  }

  public signSubscribeRequestId(): string {
    return this.signMessage(this.subscribeRequestId.value);
  }
}
