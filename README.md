# @bojanrajkovic/go-duration

Go's [`time.ParseDuration`](https://pkg.go.dev/time#ParseDuration) and
[`Duration.String`](https://pkg.go.dev/time#Duration.String) for JavaScript, built on
`Temporal.Duration`. It passes the duration tests from Go 1.27.3's `time` package.

This package is under construction. Parsing and formatting land in the next releases.

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

## License

MIT
