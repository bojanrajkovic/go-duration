import fc from "fast-check";
import { expect, test } from "vitest";

import { stringifyDuration, parseDuration } from "../src/index.js";
import { fromNanoseconds, toNanoseconds } from "../src/nanoseconds.js";
import { Millisecond } from "./go1.27.3.js";

// Go's TestParseDurationRoundTrip, see https://golang.org/issue/48629
test.each([(1n << 63n) - 1n, -(1n << 63n)])("%s round-trips", (d0) => {
  expect(toNanoseconds(parseDuration(stringifyDuration(fromNanoseconds(d0))))).toBe(d0);
});

test("random millisecond durations round-trip", () => {
  // Go: Duration(rand.Int31()) * Millisecond, 100 times. Resolutions finer than milliseconds
  // can round-trip imprecisely.
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 2 ** 31 - 1 }), (n) => {
      const d0 = BigInt(n) * Millisecond;
      return toNanoseconds(parseDuration(stringifyDuration(fromNanoseconds(d0)))) === d0;
    }),
    { numRuns: 100 },
  );
});

test("every int64 duration round-trips exactly", () => {
  // Stronger than Go's test, and the README promises it: stringified fractions have at most as many
  // digits as their unit has nanoseconds, so the float64 step in parsing is exact.
  fc.assert(
    fc.property(fc.bigInt({ min: -(1n << 63n), max: (1n << 63n) - 1n }), (d0) => {
      return toNanoseconds(parseDuration(stringifyDuration(fromNanoseconds(d0)))) === d0;
    }),
  );
});
