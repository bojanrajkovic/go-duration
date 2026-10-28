import { describe, expect, test } from "vitest";

import { stringifyDuration, type FixedLengthDurationLike } from "../src/index.js";
import { fromNanoseconds } from "../src/nanoseconds.js";
import { durationTests } from "./go1.27.3.js";

describe("durationTests (Go 1.27.3)", () => {
  test.each(durationTests)("$str", ({ str, d }) => {
    expect(stringifyDuration(fromNanoseconds(d))).toBe(str);
    // Go also checks that negating a positive duration prefixes a minus sign.
    if (d > 0n) {
      expect(stringifyDuration(fromNanoseconds(-d))).toBe(`-${str}`);
    }
  });
});

describe("input forms", () => {
  test("accepts a duration-like object", () => {
    expect(stringifyDuration({ minutes: 90 })).toBe("1h30m0s");
  });

  test("sums unbalanced fields exactly", () => {
    expect(stringifyDuration({ nanoseconds: 1e18 })).toBe("277777h46m40s");
    expect(stringifyDuration(Temporal.Duration.from({ seconds: 59, milliseconds: 1001 }))).toBe(
      "1m0.001s",
    );
  });
});

describe("errors", () => {
  test.each(["years", "months", "weeks", "days"])("rejects %s", (field) => {
    expect(() => stringifyDuration(Temporal.Duration.from({ [field]: 1 }))).toThrow(RangeError);
  });

  test("rejects durations outside the int64 nanosecond range", () => {
    expect(() => stringifyDuration({ hours: 2562048 })).toThrow(RangeError);
    expect(() => stringifyDuration({ hours: -2562048 })).toThrow(RangeError);
    expect(() => stringifyDuration({ nanoseconds: 2 ** 63 })).toThrow(RangeError);
  });

  test("passes Temporal's errors through for invalid fields", () => {
    expect(() => stringifyDuration({ hours: 1, minutes: -1 })).toThrow(RangeError);
    expect(() => stringifyDuration({ milliseconds: 1.5 })).toThrow(RangeError);
  });

  test("rejects strings from untyped callers", () => {
    const untyped: unknown = "PT1H";
    expect(() => stringifyDuration(untyped as FixedLengthDurationLike)).toThrow(TypeError);
  });

  test("passes Temporal's TypeError through for an empty object", () => {
    expect(() => stringifyDuration({})).toThrow(TypeError);
  });
});
