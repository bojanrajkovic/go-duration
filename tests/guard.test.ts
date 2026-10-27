import { afterEach, expect, test, vi } from "vitest";

const temporal = globalThis.Temporal;

afterEach(() => {
  globalThis.Temporal = temporal;
});

test("importing without Temporal throws an error naming the polyfill", async () => {
  vi.resetModules();
  // @ts-expect-error -- simulating a runtime without Temporal
  delete globalThis.Temporal;

  await expect(import("../src/index.js")).rejects.toThrow('import "temporal-polyfill/global"');
});
