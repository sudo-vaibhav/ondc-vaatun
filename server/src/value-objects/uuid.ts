import { CaseInsensitiveId } from "./case-insensitive-id";

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class UUID extends CaseInsensitiveId {
  constructor(value: string | UUID) {
    if (value instanceof UUID) {
      super(value);
    } else {
      if (!UUID_REGEX.test(value)) {
        throw new Error(
          `Invalid UUID format: ${value}. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
        );
      }
      super(value);
    }
  }

  static generate(): UUID {
    return new UUID(crypto.randomUUID());
  }
}
