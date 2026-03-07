import { format, parseISO } from "date-fns";

/**
 * Safely formats a date string from the database for display.
 * 
 * For DATE columns (YYYY-MM-DD): uses parseISO to avoid UTC midnight shift.
 * For TIMESTAMPTZ columns (ISO 8601 with timezone): parses correctly with timezone.
 * 
 * @param dateStr - Date string from the database (DATE or TIMESTAMPTZ)
 * @param fmt - date-fns format string (default: "dd/MM/yyyy")
 * @returns Formatted date string, or "—" if input is falsy
 */
export function formatDateBR(dateStr: string | null | undefined, fmt: string = "dd/MM/yyyy"): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return "—";
  }
}

/**
 * Formats a TIMESTAMPTZ string with date and time.
 * 
 * @param dateStr - TIMESTAMPTZ string from the database
 * @param fmt - date-fns format string (default: "dd/MM/yyyy HH:mm")
 * @returns Formatted datetime string, or "—" if input is falsy
 */
export function formatDateTimeBR(dateStr: string | null | undefined, fmt: string = "dd/MM/yyyy HH:mm"): string {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return "—";
  }
}
