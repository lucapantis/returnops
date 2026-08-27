import { RETURN_REASONS, RETURN_STATUSES, type ReturnReason, type ReturnStatus } from "./constants";

// Fixed categorical order (validated: worst adjacent CVD ΔE 9.1, worst
// adjacent normal-vision ΔE 19.6 — see dataviz skill's reference palette).
// Color follows the entity (status/reason), never its sort rank, so each
// stays the same color everywhere it appears.
const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const;

export const STATUS_COLORS: Record<ReturnStatus, string> = Object.fromEntries(
  RETURN_STATUSES.map((status, i) => [status, CATEGORICAL[i % CATEGORICAL.length]])
) as Record<ReturnStatus, string>;

export const REASON_COLORS: Record<ReturnReason, string> = Object.fromEntries(
  RETURN_REASONS.map((reason, i) => [reason, CATEGORICAL[i % CATEGORICAL.length]])
) as Record<ReturnReason, string>;

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
};
