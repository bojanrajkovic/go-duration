# @bojanrajkovic/go-duration

Go's [`time.ParseDuration`](https://pkg.go.dev/time#ParseDuration) and
[`Duration.String`](https://pkg.go.dev/time#Duration.String) for JavaScript, built on
`Temporal.Duration`. It passes the duration tests from Go 1.27.3's `time` package.

## Requirements

The package uses the global `Temporal` object, and it throws at import time if `Temporal`
doesn't exist. Node 26 and later ship `Temporal`. On older runtimes, Bun, Cloudflare Workers,
or browsers without it, load [`temporal-polyfill`](https://www.npmjs.com/package/temporal-polyfill)
first:

```ts
import "temporal-polyfill/global";
import { parseDuration } from "@bojanrajkovic/go-duration";
```

TypeScript users need `Temporal`'s types too. TypeScript 7 includes them in
`"lib": ["esnext.temporal"]`, and `temporal-polyfill/global` declares them as well.

The package is ESM-only.

## Parsing

`parseDuration` reads a Go duration string and returns a `Temporal.Duration`. A duration string
is an optional sign followed by one or more numbers, each with an optional decimal fraction and a
unit: `ns`, `us` (or `µs` and `μs`, with the micro sign or the Greek mu), `ms`, `s`, `m`, or `h`.

```ts
import { ParseDurationError, parseDuration } from "@bojanrajkovic/go-duration";

const deadline = Temporal.Now.instant().add(parseDuration("1m30s"));

function retryDelay(): Temporal.Duration {
  try {
    return parseDuration(process.env["RETRY_DELAY"] ?? "500ms");
  } catch (error) {
    if (!(error instanceof ParseDurationError)) {
      throw error;
    }
    // error.message is Go's text, such as: time: unknown unit "d" in duration "1d"
    throw new Error(`RETRY_DELAY is invalid: ${error.message}`, { cause: error });
  }
}
```

The result is balanced to hours, the largest unit Go uses, so `"90m"` becomes `PT1H30M`. Go has no
day unit, because a calendar day isn't always 24 hours. That also means every parsed duration works
with `Temporal.Instant.prototype.add`.

`tryParseDuration` returns a result instead of throwing:

```ts
import { tryParseDuration } from "@bojanrajkovic/go-duration";

function timeoutFrom(input: string): Temporal.Duration {
  const result = tryParseDuration(input);
  if (result.ok) {
    return result.value;
  }

  // detail.kind is "invalid", "overflow", "missing-unit", or "unknown-unit".
  const { detail } = result.error;
  if (detail.kind === "unknown-unit" && detail.unit === "d") {
    throw new Error(`Go durations have no day unit: write 24h instead of 1d`, {
      cause: result.error,
    });
  }

  console.warn(`${result.error.message}; using 30s`);
  return Temporal.Duration.from({ seconds: 30 });
}
```

Error messages match Go's byte for byte. Go reports values outside the int64 nanosecond range
(about ±292 years) as `invalid duration`, and so does this package, but its `detail.kind` is
`overflow` so you can tell the two cases apart.

## Stringifying

`stringifyDuration` writes a duration in Go's syntax, the way Go's `Duration.String` does. Use it
when a program reads the result: a config file for a Go tool, a command-line flag, or an API that
takes strings like `"30s"`. It takes a `Temporal.Duration` or a duration-like object:

```ts
import { stringifyDuration } from "@bojanrajkovic/go-duration";

stringifyDuration({ minutes: 90 }); // "1h30m0s"
stringifyDuration({ milliseconds: 1500 }); // "1.5s"
stringifyDuration(Temporal.Duration.from({ microseconds: 1500 })); // "1.5ms"
stringifyDuration({ seconds: 0 }); // "0s"
```

Durations under a second use the largest unit that fits: `ns`, `µs` (always U+00B5), or `ms`.
Longer durations use hours, minutes, and seconds, and like Go, hours is the largest unit, so two
days is `"48h0m0s"`.

The input can't contain years, months, weeks, or days, because their length depends on the
calendar. Object literals with those fields fail to compile. A `Temporal.Duration` that has them
throws a `RangeError`, as does a total outside the int64 nanosecond range. Temporal itself throws a
`RangeError` for objects with mixed signs or non-integer fields:

```ts
import { stringifyDuration } from "@bojanrajkovic/go-duration";

function timeoutFlag(timeout: Temporal.Duration): string {
  try {
    return `--timeout=${stringifyDuration(timeout)}`;
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    throw new Error(`${timeout.toString()} can't be written as a Go duration`, { cause: error });
  }
}
```

A duration from calendar math, such as `PlainDate.until`, often has days. If 24-hour days are
right for your data, convert it first with `timeout.round({ largestUnit: "hours" })`.

Strings aren't accepted, so a Go duration string can't be passed to `stringifyDuration` by mistake.
Strings fail to compile, and untyped callers get a `TypeError`. To stringify an ISO 8601 string,
convert it first with `Temporal.Duration.from("PT1H")`.

Stringifying and parsing round-trip exactly. For every duration `stringifyDuration` accepts,
`parseDuration(stringifyDuration(d))` has the same total length as `d`, balanced to hours, so
`Temporal.Duration.compare` returns 0 for the pair.

### Text for people

Go's syntax isn't meant for display. For text like "2 days, 7 hours", use `Intl.DurationFormat`,
which takes a `Temporal.Duration` and handles plurals and locales:

```ts
import { parseDuration } from "@bojanrajkovic/go-duration";

const uptime = parseDuration("55h3m").round({ largestUnit: "days" });
new Intl.DurationFormat("en", { style: "long" }).format(uptime); // "2 days, 7 hours, 3 minutes"
new Intl.DurationFormat("en", { style: "narrow" }).format(uptime); // "2d 7h 3m"
```

`round({ largestUnit: "days" })` treats each day as 24 hours. For relative text like "2 days ago",
use `Intl.RelativeTimeFormat`.

## Differences from Go

Go's parser works on bytes, so it accepts strings that aren't valid UTF-8 and quotes the bad bytes
in its error messages. JavaScript strings can't hold invalid UTF-8, so the three Go tests that use
it are skipped. A lone surrogate is the closest JavaScript equivalent, and it's quoted as U+FFFD
(`\xef\xbf\xbd`).

## License

MIT
