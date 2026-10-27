import "./guard.js";

export { stringifyDuration } from "./stringify.js";
export type { FixedLengthDurationLike } from "./stringify.js";
export { ParseDurationError, parseDuration, tryParseDuration } from "./parse.js";
export type {
  ParseDurationErrorDetail,
  ParseDurationErrorKind,
  ParseDurationResult,
} from "./parse.js";
