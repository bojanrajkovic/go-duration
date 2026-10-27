import { HOUR, LIMIT, MICROSECOND, MILLISECOND, MINUTE, NANOSECOND, SECOND } from "./constants.js";
import { fromNanoseconds } from "./nanoseconds.js";

/** What went wrong when parsing a duration. `kind` says why, and only `unknown-unit` names a unit. */
export type ParseDurationErrorDetail =
  /** The string doesn't match Go's duration grammar, such as `""`, `"-"`, or `".s"`. */
  | { readonly kind: "invalid" }
  /** The value is outside the int64 nanosecond range Go's `Duration` can hold. */
  | { readonly kind: "overflow" }
  /** A number has no unit after it, such as `"3"`. */
  | { readonly kind: "missing-unit" }
  /** `unit` isn't one of `ns`, `us`, `µs`, `μs`, `ms`, `s`, `m`, or `h`, such as `"d"` in `"1d"`. */
  | { readonly kind: "unknown-unit"; readonly unit: string };

/** Why a string isn't a valid Go duration. */
export type ParseDurationErrorKind = ParseDurationErrorDetail["kind"];

/**
 * The error `parseDuration` throws and `tryParseDuration` returns. Its `message` is byte-identical
 * to the error text from Go's `time.ParseDuration`, such as `time: unknown unit "d" in duration "1d"`.
 * Go reports overflow as `invalid duration`, so `overflow` errors share that message.
 */
export class ParseDurationError extends Error {
  override readonly name = "ParseDurationError";

  constructor(
    /** Why parsing failed. Check `detail.kind` to narrow it. */
    readonly detail: ParseDurationErrorDetail,
    /** The string that failed to parse. */
    readonly input: string,
  ) {
    super(`time: ${describe(detail)} ${quote(input)}`);
  }
}

/** The outcome of `tryParseDuration`. */
export type ParseDurationResult =
  | { readonly ok: true; readonly value: Temporal.Duration }
  | { readonly ok: false; readonly error: ParseDurationError };

/**
 * Parses a Go duration string such as `"300ms"`, `"-1.5h"`, or `"2h45m"`, following Go's
 * `time.ParseDuration` exactly. A duration is an optional sign and one or more decimal numbers,
 * each with an optional fraction and a unit: `ns`, `us` (or `µs`/`μs`), `ms`, `s`, `m`, or `h`.
 *
 * @returns A `Temporal.Duration` balanced to hours, so `"90m"` becomes `PT1H30M`.
 * @throws {ParseDurationError} If `input` isn't a valid duration or is outside the int64
 *   nanosecond range.
 */
export function parseDuration(input: string): Temporal.Duration {
  const result = tryParseDuration(input);
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}

/**
 * Parses a Go duration string like `parseDuration`, but returns failures instead of throwing.
 *
 * @returns `{ ok: true, value }` with a `Temporal.Duration` balanced to hours, or
 *   `{ ok: false, error }` with a `ParseDurationError`.
 */
export function tryParseDuration(input: string): ParseDurationResult {
  // A port of Go's ParseDuration. Go's uint64 values are bigints here, and its float64 values
  // are numbers, which are the same IEEE doubles.
  const fail = (detail: ParseDurationErrorDetail): ParseDurationResult => ({
    ok: false,
    error: new ParseDurationError(detail, input),
  });

  // An optional sign.
  let rest = input;
  let negative = false;
  if (rest.startsWith("-") || rest.startsWith("+")) {
    negative = rest.startsWith("-");
    rest = rest.slice(1);
  }

  // A bare zero is the only number that doesn't need a unit.
  if (rest === "0") {
    return { ok: true, value: fromNanoseconds(0n) };
  }
  if (rest === "") {
    return fail({ kind: "invalid" });
  }

  // One or more components, such as "1h" and "30.5m" in "1h30.5m".
  let total = 0n;
  while (rest !== "") {
    const component = parseComponent(rest);
    if (!component.ok) {
      return fail(component.detail);
    }

    total += component.nanoseconds;
    if (total > LIMIT) {
      return fail({ kind: "overflow" });
    }
    rest = component.rest;
  }

  // Only a negative duration can have a magnitude of 1<<63.
  if (negative) {
    return { ok: true, value: fromNanoseconds(-total) };
  }
  if (total > LIMIT - 1n) {
    return fail({ kind: "overflow" });
  }
  return { ok: true, value: fromNanoseconds(total) };
}

/** The result of reading a piece from the start of a string: the piece and what's left, or why it failed. */
type Scan<T> =
  | ({ readonly ok: true; readonly rest: string } & T)
  | { readonly ok: false; readonly detail: ParseDurationErrorDetail };

const units: ReadonlyMap<string, bigint> = new Map([
  ["ns", NANOSECOND],
  ["us", MICROSECOND],
  ["µs", MICROSECOND], // U+00B5 micro sign
  ["μs", MICROSECOND], // U+03BC Greek letter mu
  ["ms", MILLISECOND],
  ["s", SECOND],
  ["m", MINUTE],
  ["h", HOUR],
]);

/**
 * Reads one number and its unit from the start of `s`, such as `"30.5m"` from `"30.5m10s"`.
 * The number is `[0-9]*(\.[0-9]*)?` with at least one digit, and the unit is everything up to the
 * next digit or point.
 */
function parseComponent(s: string): Scan<{ readonly nanoseconds: bigint }> {
  // The whole part.
  if (!isNumberChar(s[0])) {
    return { ok: false, detail: { kind: "invalid" } };
  }
  const whole = leadingInt(s);
  if (!whole.ok) {
    return whole;
  }
  let rest = whole.rest;
  const hasWholeDigits = rest.length !== s.length;

  // The fraction, if there's a decimal point.
  let fraction = { digits: 0n, scale: 1 };
  let hasFractionDigits = false;
  if (rest.startsWith(".")) {
    const afterPoint = rest.slice(1);
    const scanned = leadingFraction(afterPoint);
    fraction = scanned;
    hasFractionDigits = scanned.rest.length !== afterPoint.length;
    rest = scanned.rest;
  }
  if (!hasWholeDigits && !hasFractionDigits) {
    // A point with no digits on either side, as in ".s" or "-.s".
    return { ok: false, detail: { kind: "invalid" } };
  }

  // The unit.
  let unitEnd = 0;
  while (unitEnd < rest.length && !isNumberChar(rest[unitEnd])) {
    unitEnd++;
  }
  if (unitEnd === 0) {
    return { ok: false, detail: { kind: "missing-unit" } };
  }
  const unitName = rest.slice(0, unitEnd);
  const unitSize = units.get(unitName);
  if (unitSize === undefined) {
    return { ok: false, detail: { kind: "unknown-unit", unit: unitName } };
  }
  rest = rest.slice(unitEnd);

  // The value in nanoseconds, failing past 1<<63 like Go.
  if (whole.value > LIMIT / unitSize) {
    return { ok: false, detail: { kind: "overflow" } };
  }
  let nanoseconds = whole.value * unitSize;
  if (fraction.digits > 0n) {
    // Go uses float64 here to stay nanosecond-accurate for fractions of hours.
    const fractionNanoseconds = Number(fraction.digits) * (Number(unitSize) / fraction.scale);
    nanoseconds += BigInt(Math.trunc(fractionNanoseconds));
    if (nanoseconds > LIMIT) {
      return { ok: false, detail: { kind: "overflow" } };
    }
  }

  return { ok: true, nanoseconds, rest };
}

function isDigit(c: string | undefined): boolean {
  return c !== undefined && c >= "0" && c <= "9";
}

function isNumberChar(c: string | undefined): boolean {
  return c === "." || isDigit(c);
}

/** Go's leadingInt: reads [0-9]* from the start of `s`, failing if the number passes 1<<63. */
function leadingInt(s: string): Scan<{ readonly value: bigint }> {
  let value = 0n;
  let i = 0;
  for (; i < s.length && isDigit(s[i]); i++) {
    if (value > LIMIT / 10n) {
      return { ok: false, detail: { kind: "overflow" } };
    }
    value = value * 10n + BigInt(s.charCodeAt(i) - 48);
    if (value > LIMIT) {
      return { ok: false, detail: { kind: "overflow" } };
    }
  }
  return { ok: true, value, rest: s.slice(i) };
}

/**
 * Go's leadingFraction: reads [0-9]* from the start of `s` as the fraction `digits / scale`.
 * Past int64 precision it keeps reading digits but stops accumulating them, so it can't fail.
 */
function leadingFraction(s: string): {
  readonly digits: bigint;
  readonly scale: number;
  readonly rest: string;
} {
  let digits = 0n;
  let scale = 1;
  let full = false;
  let i = 0;
  for (; i < s.length && isDigit(s[i]); i++) {
    if (full) {
      continue;
    }
    // It's possible for overflow to give a positive number, so check before and after.
    if (digits > (LIMIT - 1n) / 10n) {
      full = true;
      continue;
    }
    const next = digits * 10n + BigInt(s.charCodeAt(i) - 48);
    if (next > LIMIT) {
      full = true;
      continue;
    }
    digits = next;
    scale *= 10;
  }
  return { digits, scale, rest: s.slice(i) };
}

function describe(detail: ParseDurationErrorDetail): string {
  switch (detail.kind) {
    case "invalid":
    case "overflow":
      return "invalid duration";
    case "missing-unit":
      return "missing unit in duration";
    case "unknown-unit":
      return `unknown unit ${quote(detail.unit)} in duration`;
  }
}

const encoder = new TextEncoder();

/**
 * Go's time.quote: wraps `s` in quotes, escapes `"` and `\`, and writes each UTF-8 byte of
 * non-ASCII and control characters as `\xNN`. TextEncoder turns lone surrogates into U+FFFD,
 * which Go quotes the same way.
 */
function quote(s: string): string {
  let quoted = '"';
  for (const byte of encoder.encode(s)) {
    if (byte >= 0x80 || byte < 0x20) {
      quoted += `\\x${byte.toString(16).padStart(2, "0")}`;
    } else if (byte === 0x22 || byte === 0x5c) {
      quoted += `\\${String.fromCharCode(byte)}`;
    } else {
      quoted += String.fromCharCode(byte);
    }
  }
  return `${quoted}"`;
}
