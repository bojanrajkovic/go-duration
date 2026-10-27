import { LIMIT, MICROSECOND, MILLISECOND, MINUTE, SECOND } from "./constants.js";
import { toNanoseconds } from "./nanoseconds.js";

type CalendarUnit = "years" | "months" | "weeks" | "days";

/**
 * A `Temporal.Duration`, or a duration-like object without calendar units, such as
 * `{ minutes: 90 }`. Calendar units are typed `never` so `{ days: 1 }` fails to compile even
 * when it comes from a variable. ISO 8601 strings aren't accepted, so a Go duration string can't
 * be passed by mistake.
 */
export type FixedLengthDurationLike =
  | Temporal.Duration
  | (Omit<Temporal.DurationLikeObject, CalendarUnit> & { readonly [K in CalendarUnit]?: never });

/**
 * Writes a duration in Go's duration syntax, as Go's `Duration.String` does, such as `"72h3m0.5s"`.
 * The output is for programs that read Go durations, and `parseDuration` reads it back exactly.
 * For text people read, such as "2 days, 7 hours", use `Intl.DurationFormat`.
 *
 * Durations under a second use the largest unit that fits, such as `"1.5µs"` (with U+00B5) or
 * `"300ms"`, and zero is `"0s"`. Like Go, the largest unit is hours: 48 hours is `"48h0m0s"`.
 *
 * @throws {RangeError} If a `Temporal.Duration` has years, months, weeks, or days, which have no
 *   fixed length, or if the total is outside the int64 nanosecond range (about ±292 years).
 *   Temporal also throws a RangeError for objects with mixed signs or non-integer fields.
 * @throws {TypeError} If `d` is a string, or an object with no duration fields, such as `{}`.
 */
export function stringifyDuration(d: FixedLengthDurationLike): string {
  // The type already rejects strings. This stops untyped callers, since Temporal would parse ISO
  // 8601 strings and give a confusing error for Go strings.
  if (typeof d === "string") {
    throw new TypeError(
      "stringifyDuration takes a duration, not a string. Use parseDuration for Go strings.",
    );
  }
  // A Duration from another Temporal implementation or realm fails instanceof and gets copied.
  const ns = toNanoseconds(d instanceof Temporal.Duration ? d : Temporal.Duration.from(d));
  if (ns < -LIMIT || ns >= LIMIT) {
    throw new RangeError("duration is outside the int64 nanosecond range");
  }
  return goFormat(ns);
}

/** A port of Go's Duration.format. */
function goFormat(ns: bigint): string {
  const sign = ns < 0n ? "-" : "";
  const magnitude = ns < 0n ? -ns : ns;
  if (magnitude === 0n) {
    return "0s";
  }

  if (magnitude < SECOND) {
    // Go prints sub-second durations in the largest unit that fits.
    const [unit, prec] =
      magnitude < MICROSECOND ? ["ns", 0] : magnitude < MILLISECOND ? ["µs", 3] : ["ms", 6];
    return sign + withFrac(magnitude, prec) + unit;
  }

  const seconds = `${withFrac(magnitude % MINUTE, 9)}s`;
  const minutes = magnitude / MINUTE;
  if (minutes === 0n) {
    return sign + seconds;
  }
  // Stop at hours, like Go, because days can be different lengths.
  const hours = minutes / 60n;
  return `${sign}${hours > 0n ? `${hours}h` : ""}${minutes % 60n}m${seconds}`;
}

/**
 * Go's fmtFrac and fmtInt: `v` as a decimal with `prec` fraction digits, dropping trailing zeros
 * and the point when the fraction is zero. `withFrac(1500n, 3)` is `"1.5"`.
 */
function withFrac(v: bigint, prec: number): string {
  const p = 10n ** BigInt(prec);
  const frac = (v % p).toString().padStart(prec, "0").replace(/0+$/, "");
  return frac ? `${v / p}.${frac}` : `${v / p}`;
}
