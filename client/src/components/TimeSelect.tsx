/**
 * TimeSelect – a 12-hour AM/PM time picker built from three <select> dropdowns.
 *
 * Value format accepted and emitted: "H:MM AM" / "H:MM PM"  (e.g. "10:00 AM", "1:30 PM")
 * This matches the format used in the seed data and stored in the DB.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Parse helpers ─────────────────────────────────────────────────────────────

/** Parse any reasonable time string into { hour12, minute, period }. */
function parseTime(value: string): { hour12: string; minute: string; period: "AM" | "PM" } {
  if (!value) return { hour12: "9", minute: "00", period: "AM" };

  // Handle "H:MM AM/PM" or "H:MM:SS AM/PM"
  const ampmMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (ampmMatch) {
    return {
      hour12: String(parseInt(ampmMatch[1], 10)),
      minute: ampmMatch[2].padStart(2, "0"),
      period: ampmMatch[3].toUpperCase() as "AM" | "PM",
    };
  }

  // Handle "HH:MM" 24-hour (legacy / browser input type="time")
  const h24Match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    let h = parseInt(h24Match[1], 10);
    const m = h24Match[2].padStart(2, "0");
    const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return { hour12: String(h), minute: m, period };
  }

  return { hour12: "9", minute: "00", period: "AM" };
}

/** Compose back to "H:MM AM/PM" string. */
function buildTime(hour12: string, minute: string, period: "AM" | "PM"): string {
  return `${hour12}:${minute} ${period}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const HOURS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimeSelect({ value, onChange }: TimeSelectProps) {
  const { hour12, minute, period } = parseTime(value);

  const update = (h: string, m: string, p: "AM" | "PM") => onChange(buildTime(h, m, p));

  return (
    <div className="flex items-center gap-1">
      {/* Hour */}
      <Select value={hour12} onValueChange={(h) => update(h, minute, period)}>
        <SelectTrigger className="w-16 h-8 text-sm px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-gray-400 text-sm font-medium">:</span>

      {/* Minute */}
      <Select value={minute} onValueChange={(m) => update(hour12, m, period)}>
        <SelectTrigger className="w-16 h-8 text-sm px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* AM/PM */}
      <Select value={period} onValueChange={(p) => update(hour12, minute, p as "AM" | "PM")}>
        <SelectTrigger className="w-16 h-8 text-sm px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
