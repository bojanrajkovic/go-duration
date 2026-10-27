import fc from "fast-check";
import { expect, test } from "vitest";

import { fromNanoseconds, toNanoseconds } from "../src/nanoseconds.js";

const int64 = fc.bigInt({ min: -(1n << 63n), max: (1n << 63n) - 1n });

test("fromNanoseconds and toNanoseconds round-trip every int64", () => {
  fc.assert(fc.property(int64, (ns) => toNanoseconds(fromNanoseconds(ns)) === ns));
});

test("fromNanoseconds keeps the sign", () => {
  fc.assert(
    fc.property(int64, (ns) => fromNanoseconds(ns).sign === (ns > 0n ? 1 : ns < 0n ? -1 : 0)),
  );
});

test.each(["years", "months", "weeks", "days"])("toNanoseconds rejects %s", (field) => {
  expect(() => toNanoseconds(Temporal.Duration.from({ [field]: 1 }))).toThrow(RangeError);
});
