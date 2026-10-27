// index.ts imports this module first, so the check runs before any other module evaluates.
// That turns a bare ReferenceError at the first Temporal use into an error that names the fix.
if (typeof globalThis.Temporal === "undefined") {
  throw new Error(
    '@bojanrajkovic/go-duration needs Temporal. Use Node >=26, or run `import "temporal-polyfill/global"` before importing this package.',
  );
}
