// Fail at import time with a fix, instead of a bare ReferenceError at the first call.
if (typeof globalThis.Temporal === "undefined") {
  throw new Error(
    '@bojanrajkovic/go-duration needs Temporal. Use Node >=26, or run `import "temporal-polyfill/global"` before importing this package.',
  );
}

export {};
