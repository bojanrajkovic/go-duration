import { describe, expect, test } from "vitest";

import { ParseDurationError, parseDuration, tryParseDuration } from "../src/index.js";
import { toNanoseconds } from "../src/nanoseconds.js";
import { parseDurationErrorTests, parseDurationTests } from "./go1.27.3.js";

describe("parseDurationTests (Go 1.27.3)", () => {
  test.each(parseDurationTests)("$in", ({ in: input, want }) => {
    expect(toNanoseconds(parseDuration(input))).toBe(want);

    const result = tryParseDuration(input);
    expect(result.ok && toNanoseconds(result.value)).toBe(want);
  });
});

describe("parseDurationErrorTests (Go 1.27.3)", () => {
  test.each(parseDurationErrorTests.filter((row) => !row.skip))("$expect", (row) => {
    const result = tryParseDuration(row.in);
    if (result.ok) {
      throw new Error(`expected an error, got ${result.value.toString()}`);
    }
    expect(result.error).toBeInstanceOf(ParseDurationError);
    expect(result.error.detail).toEqual(row.detail);
    expect(result.error.input).toBe(row.in);
    expect(result.error.message).toBe(row.message);
    expect(result.error.message).toContain(row.expect); // Go's own check

    expect(() => parseDuration(row.in)).toThrow(result.error);
  });

  test.skip.each(parseDurationErrorTests.filter((row) => row.skip))(
    "$expect: Go's input is invalid UTF-8, which a JavaScript string can't hold",
    () => {},
  );
});

describe("Temporal result", () => {
  test("is balanced to hours", () => {
    expect(parseDuration("90m").toString()).toBe("PT1H30M");
    expect(parseDuration("1h2m3s4ms5us6ns").toString()).toBe("PT1H2M3.004005006S");
  });

  test("carries the sign on every field", () => {
    const d = parseDuration("-1h30m");
    expect([d.sign, d.hours, d.minutes]).toEqual([-1, -1, -30]);
  });

  test("-0 is a zero duration", () => {
    expect(parseDuration("-0").sign).toBe(0);
  });
});

describe("ParseDurationError", () => {
  test("quotes lone surrogates as U+FFFD", () => {
    expect(() => parseDuration("\uD800")).toThrow('time: invalid duration "\\xef\\xbf\\xbd"');
  });

  test("escapes quotes, backslashes, and control characters like Go", () => {
    expect(() => parseDuration('a"b\\c\n')).toThrow('time: invalid duration "a\\"b\\\\c\\x0a"');
  });

  test("has a name", () => {
    expect(new ParseDurationError({ kind: "invalid" }, "x").name).toBe("ParseDurationError");
  });
});
