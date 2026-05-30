import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const differenceMs = Date.now() - Date.parse(value);
  const differenceMinutes = Math.round(differenceMs / 60000);

  if (differenceMinutes < 1) return "just now";
  if (differenceMinutes < 60) return `${differenceMinutes}m ago`;

  const differenceHours = Math.round(differenceMinutes / 60);
  if (differenceHours < 24) return `${differenceHours}h ago`;

  const differenceDays = Math.round(differenceHours / 24);
  return `${differenceDays}d ago`;
}
