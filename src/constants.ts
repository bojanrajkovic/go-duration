// Go's unit constants, in nanoseconds.
export const NANOSECOND: bigint = 1n;
export const MICROSECOND: bigint = 1000n * NANOSECOND;
export const MILLISECOND: bigint = 1000n * MICROSECOND;
export const SECOND: bigint = 1000n * MILLISECOND;
export const MINUTE: bigint = 60n * SECOND;
export const HOUR: bigint = 60n * MINUTE;

/** Go's 1<<63: the magnitude of the smallest int64, one more than the largest. */
export const LIMIT: bigint = 1n << 63n;

/** The Temporal.Duration fields a Go duration uses: hours down to nanoseconds. */
export type TimeField =
  | "hours"
  | "minutes"
  | "seconds"
  | "milliseconds"
  | "microseconds"
  | "nanoseconds";

// Field sizes for a Temporal.Duration balanced to hours, the largest unit Go's Duration uses.
export const TIME_FIELDS: ReadonlyArray<readonly [TimeField, bigint]> = [
  ["hours", HOUR],
  ["minutes", MINUTE],
  ["seconds", SECOND],
  ["milliseconds", MILLISECOND],
  ["microseconds", MICROSECOND],
  ["nanoseconds", NANOSECOND],
];
