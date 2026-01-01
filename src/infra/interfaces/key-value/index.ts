import type { JsonValue } from "type-fest";

export type ITenantKeyValueStore = {
  get keyPrefix(): string;

  KEYS(prefixPattern: string): Promise<string[]>;
  del(key: string): Promise<number>;
  get json(): {
    set: (key: string, path: string, value: JsonValue) => Promise<void>;
    get: <T>(key: string) => Promise<T | null>;
    mGet: <T>(keys: string[], path: string) => Promise<(T | null)[]>;
  };
};
