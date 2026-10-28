import { TIME_FIELDS, type TimeField } from "./constants.js";

/**
 * Splits a count of nanoseconds into a `Temporal.Duration` balanced to hours, so `5400000000000n`
 * becomes `PT1H30M`. Every field carries the sign, because bigint `/` and `%` truncate toward zero.
 * Each field ends up small enough to convert to a number exactly.
 */
export function fromNanoseconds(ns: bigint): Temporal.Duration {
  const parts: Partial<Record<TimeField, number>> = {};
  let rest = ns;
  for (const [field, size] of TIME_FIELDS) {
    parts[field] = Number(rest / size);
    rest %= size;
  }
  return Temporal.Duration.from(parts);
}

/**
 * Sums the hours through nanoseconds fields of `d` exactly.
 *
 * @throws {RangeError} If `d` has years, months, weeks, or days, which have no fixed length.
 */
export function toNanoseconds(d: Temporal.Duration): bigint {
  if (d.years || d.months || d.weeks || d.days) {
    throw new RangeError("years, months, weeks, and days have no fixed length");
  }
  return TIME_FIELDS.reduce((sum, [field, size]) => sum + BigInt(d[field]) * size, 0n);
}
