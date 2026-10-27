// Test tables from Go 1.27.3, src/time/time_test.go, copied with Go's expressions and comments.
// https://github.com/golang/go/blob/go1.27.3/src/time/time_test.go

import type { ParseDurationErrorDetail } from "../src/index.js";

export const Nanosecond: bigint = 1n;
export const Microsecond: bigint = 1000n * Nanosecond;
export const Millisecond: bigint = 1000n * Microsecond;
export const Second: bigint = 1000n * Millisecond;
export const Minute: bigint = 60n * Second;
export const Hour: bigint = 60n * Minute;

export const parseDurationTests: ReadonlyArray<{ readonly in: string; readonly want: bigint }> = [
  // simple
  { in: "0", want: 0n },
  { in: "5s", want: 5n * Second },
  { in: "30s", want: 30n * Second },
  { in: "1478s", want: 1478n * Second },
  // sign
  { in: "-5s", want: -5n * Second },
  { in: "+5s", want: 5n * Second },
  { in: "-0", want: 0n },
  { in: "+0", want: 0n },
  // decimal
  { in: "5.0s", want: 5n * Second },
  { in: "5.6s", want: 5n * Second + 600n * Millisecond },
  { in: "5.s", want: 5n * Second },
  { in: ".5s", want: 500n * Millisecond },
  { in: "1.0s", want: 1n * Second },
  { in: "1.00s", want: 1n * Second },
  { in: "1.004s", want: 1n * Second + 4n * Millisecond },
  { in: "1.0040s", want: 1n * Second + 4n * Millisecond },
  { in: "100.00100s", want: 100n * Second + 1n * Millisecond },
  // different units
  { in: "10ns", want: 10n * Nanosecond },
  { in: "11us", want: 11n * Microsecond },
  { in: "12µs", want: 12n * Microsecond }, // U+00B5
  { in: "12μs", want: 12n * Microsecond }, // U+03BC
  { in: "13ms", want: 13n * Millisecond },
  { in: "14s", want: 14n * Second },
  { in: "15m", want: 15n * Minute },
  { in: "16h", want: 16n * Hour },
  // composite durations
  { in: "3h30m", want: 3n * Hour + 30n * Minute },
  { in: "10.5s4m", want: 4n * Minute + 10n * Second + 500n * Millisecond },
  { in: "-2m3.4s", want: -(2n * Minute + 3n * Second + 400n * Millisecond) },
  {
    in: "1h2m3s4ms5us6ns",
    want:
      1n * Hour + 2n * Minute + 3n * Second + 4n * Millisecond + 5n * Microsecond + 6n * Nanosecond,
  },
  { in: "39h9m14.425s", want: 39n * Hour + 9n * Minute + 14n * Second + 425n * Millisecond },
  // large value
  { in: "52763797000ns", want: 52763797000n * Nanosecond },
  // more than 9 digits after decimal point, see https://golang.org/issue/6617
  { in: "0.3333333333333333333h", want: 20n * Minute },
  // 9007199254740993 = 1<<53+1 cannot be stored precisely in a float64
  { in: "9007199254740993ns", want: ((1n << 53n) + 1n) * Nanosecond },
  // largest duration that can be represented by int64 in nanoseconds
  { in: "9223372036854775807ns", want: ((1n << 63n) - 1n) * Nanosecond },
  { in: "9223372036854775.807us", want: ((1n << 63n) - 1n) * Nanosecond },
  { in: "9223372036s854ms775us807ns", want: ((1n << 63n) - 1n) * Nanosecond },
  { in: "-9223372036854775808ns", want: -(1n << 63n) * Nanosecond },
  { in: "-9223372036854775.808us", want: -(1n << 63n) * Nanosecond },
  { in: "-9223372036s854ms775us808ns", want: -(1n << 63n) * Nanosecond },
  // largest negative value
  { in: "-9223372036854775808ns", want: -(1n << 63n) * Nanosecond },
  // largest negative round trip value, see https://golang.org/issue/48629
  { in: "-2562047h47m16.854775808s", want: -(1n << 63n) * Nanosecond },
  // huge string; issue 15011.
  { in: "0.100000000000000000000h", want: 6n * Minute },
  // This value tests the first overflow check in leadingFraction.
  { in: "0.830103483285477580700h", want: 49n * Minute + 48n * Second + 372539827n * Nanosecond },
];

// `in` and `expect` are Go's. `detail` and `message` are ours: Go only checks that the error
// message contains `expect`, and we check the whole message plus the error detail.
// `skip` marks Go inputs that are invalid UTF-8, which a JavaScript string can't hold. Those rows
// spell the bytes the way Go's source does, as `\\x` escapes.
export const parseDurationErrorTests: ReadonlyArray<{
  readonly in: string;
  readonly expect: string;
  readonly detail: ParseDurationErrorDetail;
  readonly message: string;
  readonly skip: boolean;
}> = [
  // invalid
  {
    in: "",
    expect: `""`,
    detail: { kind: "invalid" },
    message: `time: invalid duration ""`,
    skip: false,
  },
  {
    in: "3",
    expect: `"3"`,
    detail: { kind: "missing-unit" },
    message: `time: missing unit in duration "3"`,
    skip: false,
  },
  {
    in: "-",
    expect: `"-"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "-"`,
    skip: false,
  },
  {
    in: "s",
    expect: `"s"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "s"`,
    skip: false,
  },
  {
    in: ".",
    expect: `"."`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "."`,
    skip: false,
  },
  {
    in: "-.",
    expect: `"-."`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "-."`,
    skip: false,
  },
  {
    in: ".s",
    expect: `".s"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration ".s"`,
    skip: false,
  },
  {
    in: "+.s",
    expect: `"+.s"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "+.s"`,
    skip: false,
  },
  {
    in: "1d",
    expect: `"1d"`,
    detail: { kind: "unknown-unit", unit: "d" },
    message: `time: unknown unit "d" in duration "1d"`,
    skip: false,
  },
  {
    in: "\\x85\\x85",
    expect: `"\\x85\\x85"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "\\x85\\x85"`,
    skip: true,
  },
  {
    in: "\\xffff",
    expect: `"\\xffff"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "\\xffff"`,
    skip: true,
  },
  {
    in: "hello \\xffff world",
    expect: `"hello \\xffff world"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "hello \\xffff world"`,
    skip: true,
  },
  {
    in: "\uFFFD",
    expect: `"\\xef\\xbf\\xbd"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "\\xef\\xbf\\xbd"`,
    skip: false,
  }, // utf8.RuneError
  {
    in: "\uFFFD hello \uFFFD world",
    expect: `"\\xef\\xbf\\xbd hello \\xef\\xbf\\xbd world"`,
    detail: { kind: "invalid" },
    message: `time: invalid duration "\\xef\\xbf\\xbd hello \\xef\\xbf\\xbd world"`,
    skip: false,
  }, // utf8.RuneError
  // overflow
  {
    in: "9223372036854775810ns",
    expect: `"9223372036854775810ns"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "9223372036854775810ns"`,
    skip: false,
  },
  {
    in: "9223372036854775808ns",
    expect: `"9223372036854775808ns"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "9223372036854775808ns"`,
    skip: false,
  },
  {
    in: "-9223372036854775809ns",
    expect: `"-9223372036854775809ns"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "-9223372036854775809ns"`,
    skip: false,
  },
  {
    in: "9223372036854776us",
    expect: `"9223372036854776us"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "9223372036854776us"`,
    skip: false,
  },
  {
    in: "3000000h",
    expect: `"3000000h"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "3000000h"`,
    skip: false,
  },
  {
    in: "9223372036854775.808us",
    expect: `"9223372036854775.808us"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "9223372036854775.808us"`,
    skip: false,
  },
  {
    in: "9223372036854ms775us808ns",
    expect: `"9223372036854ms775us808ns"`,
    detail: { kind: "overflow" },
    message: `time: invalid duration "9223372036854ms775us808ns"`,
    skip: false,
  },
];

export const durationTests: ReadonlyArray<{ readonly str: string; readonly d: bigint }> = [
  { str: "0s", d: 0n },
  { str: "1ns", d: 1n * Nanosecond },
  { str: "1.1µs", d: 1100n * Nanosecond },
  { str: "2.2ms", d: 2200n * Microsecond },
  { str: "3.3s", d: 3300n * Millisecond },
  { str: "4m5s", d: 4n * Minute + 5n * Second },
  { str: "4m5.001s", d: 4n * Minute + 5001n * Millisecond },
  { str: "5h6m7.001s", d: 5n * Hour + 6n * Minute + 7001n * Millisecond },
  { str: "8m0.000000001s", d: 8n * Minute + 1n * Nanosecond },
  { str: "2562047h47m16.854775807s", d: (1n << 63n) - 1n },
  { str: "-2562047h47m16.854775808s", d: -(1n << 63n) },
];
