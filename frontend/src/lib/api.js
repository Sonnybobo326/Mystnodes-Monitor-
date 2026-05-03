import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 15000 });

export const fmtUsd = (n, digits = 2) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtNum = (n, digits = 2) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : Number(n).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

export const fmtPct = (n, digits = 2) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : `${n >= 0 ? "+" : ""}${Number(n).toFixed(digits)}%`;

export const fmtCompact = (n) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

export const fmtDays = (d) => {
  if (d === null || d === undefined || Number.isNaN(d)) return "—";
  if (d < 1) return `${(d * 24).toFixed(1)}h`;
  if (d < 365) return `${d.toFixed(0)}d`;
  return `${(d / 365).toFixed(2)}y`;
};
