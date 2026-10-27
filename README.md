# @bojanrajkovic/go-duration

Go's [`time.ParseDuration`](https://pkg.go.dev/time#ParseDuration) for JavaScript, built on
`Temporal.Duration`. It passes Go 1.27.3's `ParseDuration` tests.

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

## Differences from Go

Go's parser works on bytes, so it accepts strings that aren't valid UTF-8 and quotes the bad bytes
in its error messages. JavaScript strings can't hold invalid UTF-8, so the three Go tests that use
it are skipped. A lone surrogate is the closest JavaScript equivalent, and it's quoted as U+FFFD
(`\xef\xbf\xbd`).

## License

MIT
