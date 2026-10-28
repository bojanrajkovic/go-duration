// Type tests. `vitest run --typecheck` type-checks these files without running them.

import { expectTypeOf, test } from "vitest";

import { stringifyDuration, type FixedLengthDurationLike } from "../src/index.js";

test("accepts Temporal.Duration and time-only objects", () => {
  expectTypeOf(Temporal.Duration.from({ hours: 1 })).toExtend<FixedLengthDurationLike>();
  expectTypeOf({ minutes: 90 }).toExtend<FixedLengthDurationLike>();
  expectTypeOf(stringifyDuration).returns.toEqualTypeOf<string>();
});

test("rejects calendar units", () => {
  // @ts-expect-error -- calendar units have no fixed length
  stringifyDuration({ days: 1 });

  const bag: { days: number } = { days: 1 };
  // @ts-expect-error -- also rejected when the object isn't a literal
  stringifyDuration(bag);
});

test("rejects strings", () => {
  // @ts-expect-error -- ISO 8601 strings aren't accepted; use Temporal.Duration.from
  stringifyDuration("PT1H");
});
