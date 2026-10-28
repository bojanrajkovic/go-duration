import { expect, test } from "vitest";

import { stringifyDuration, parseDuration } from "../src/index.js";
import { toNanoseconds } from "../src/nanoseconds.js";

// Go 1.27.3, src/time/example_test.go

test("ExampleDuration_String", () => {
  expect(stringifyDuration({ hours: 1, minutes: 2, milliseconds: 300 })).toBe("1h2m0.3s");
  expect(stringifyDuration({ milliseconds: 300 })).toBe("300ms");
});

test("ExampleParseDuration", () => {
  const hours = parseDuration("10h");
  const complex = parseDuration("1h10m10s");
  const micro = parseDuration("1µs");
  // The package also accepts the incorrect but common prefix u for micro.
  const micro2 = parseDuration("1us");

  expect(stringifyDuration(hours)).toBe("10h0m0s");
  expect(stringifyDuration(complex)).toBe("1h10m10s");
  // Go prints these with Seconds() and Nanoseconds(), which this package leaves to Temporal.
  expect(complex.total("seconds")).toBe(4210);
  expect(toNanoseconds(micro)).toBe(1000n);
  expect(stringifyDuration(micro)).toBe("1µs");
  expect(micro2.total("seconds")).toBe(1e-6);
  expect(stringifyDuration(micro2)).toBe("1µs");
});
