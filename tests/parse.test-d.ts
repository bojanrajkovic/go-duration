// Type tests. `vitest run --typecheck` type-checks these files without running them.

import { expectTypeOf, test } from "vitest";

import {
  ParseDurationError,
  parseDuration,
  tryParseDuration,
  type ParseDurationErrorKind,
} from "../src/index.js";

test("parseDuration returns a Temporal.Duration", () => {
  expectTypeOf(parseDuration).returns.toEqualTypeOf<Temporal.Duration>();
});

test("checking ok narrows the result", () => {
  const result = tryParseDuration("1s");
  if (result.ok) {
    expectTypeOf(result.value).toEqualTypeOf<Temporal.Duration>();
  } else {
    expectTypeOf(result.error).toEqualTypeOf<ParseDurationError>();
  }
});

test("checking detail.kind narrows to the unit after catch", () => {
  try {
    parseDuration("1d");
  } catch (error) {
    if (!(error instanceof ParseDurationError)) {
      throw error;
    }
    if (error.detail.kind === "unknown-unit") {
      expectTypeOf(error.detail.unit).toEqualTypeOf<string>();
    } else {
      expectTypeOf(error.detail).not.toHaveProperty("unit");
    }
  }
});

test("kinds are a closed set", () => {
  expectTypeOf<ParseDurationErrorKind>().toEqualTypeOf<
    "invalid" | "overflow" | "missing-unit" | "unknown-unit"
  >();
  const error = new ParseDurationError({ kind: "invalid" }, "");
  // @ts-expect-error -- "overflo" isn't a kind
  void (error.detail.kind === "overflo");
});

test("only unknown-unit details carry a unit", () => {
  // @ts-expect-error -- unknown-unit details need the unit
  void new ParseDurationError({ kind: "unknown-unit" }, "1d");
  // @ts-expect-error -- other kinds don't take a unit
  void new ParseDurationError({ kind: "invalid", unit: "d" }, "1d");
});
