export class Id {
  #value: number | string;
  constructor(value: number | string | Id) {
    if (value instanceof Id) {
      this.#value = value.value;
    } else {
      if (typeof value === "number") {
        if (!Number.isInteger(value) || value <= 0) {
          throw new Error("Id must be a positive integer");
        }
      } else {
        if (value.length === 0) {
          throw new Error("Id must be a non-empty string");
        }
      }
      this.#value = value;
    }
  }
  equals(id: Id) {
    return this.#value === id.#value;
  }
  get __dangerousRawValue() {
    return this.#value;
  }
  get value() {
    return `${this.#value}`;
  }
  toString() {
    return this.value;
  }
}
