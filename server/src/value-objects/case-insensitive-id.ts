import { Id } from "./id";

export class CaseInsensitiveId extends Id {
  constructor(value: number | string | Id) {
    if (value instanceof Id) {
      super(value.value);
    } else {
      super(value.toString().toUpperCase());
    }
  }
}
