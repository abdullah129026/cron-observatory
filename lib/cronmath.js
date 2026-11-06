// Cron parsing plus IANA-timezone-aware next/previous occurrence.
// Hand-rolled over Intl, no dependency (PLAN ADR 7). The DST rule:
// the repeated hour counts as one expected window, so an ambiguous
// wall time resolves to its earlier instant. A wall time that does
// not exist (spring-forward gap) has no occurrence that day.
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DAYS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

const dtfCache = new Map();
function dtf(tz) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      weekday: "short",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export function isValidTimezone(tz) {
  if (typeof tz !== "string" || !tz) return false;
  try {
    dtf(tz);
    return true;
  } catch {
    return false;
  }
}

// Wall-clock fields of an instant in tz. weekday: 0 (Sun) .. 6 (Sat).
export function tzParts(date, tz) {
  const parts = {};
  for (const p of dtf(tz).formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: DAYS[parts.weekday.toLowerCase()],
  };
}

// Offset of tz at an instant, in ms (wall clock minus UTC).
function tzOffsetMs(date, tz) {
  const p = tzParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

// Wall time in tz to a UTC instant. Returns null when the wall time
// does not exist (spring-forward gap). Ambiguous wall times resolve
// to the earlier instant: one expected window per repeated hour.
export function zonedTimeToUtc(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let offset = tzOffsetMs(new Date(guess), tz);
  let utc = guess - offset;
  const offset2 = tzOffsetMs(new Date(utc), tz);
  if (offset2 !== offset) utc = guess - offset2;
  const p = tzParts(new Date(utc), tz);
  if (p.year !== y || p.month !== mo || p.day !== d || p.hour !== h || p.minute !== mi) {
    return null; // wall time skipped by a forward transition
  }
  const earlier = new Date(utc - 3600000);
  const q = tzParts(earlier, tz);
  if (q.year === y && q.month === mo && q.day === d && q.hour === h && q.minute === mi) {
    return earlier; // repeated hour: take the first occurrence
  }
  return new Date(utc);
}

function parseField(str, min, max, names) {
  const values = new Set();
  let restricted = false;
  for (const part of str.split(",")) {
    if (part === "*") continue;
    restricted = true;
    const [range, stepStr] = part.split("/");
    const step = stepStr === undefined ? 1 : Number(stepStr);
    if (!Number.isInteger(step) || step < 1) throw new Error(`cron: bad step in "${part}"`);
    let lo, hi;
    if (range === "*") {
      lo = min; hi = max;
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      lo = num(a, names); hi = num(b, names);
    } else {
      lo = num(range, names);
      // "5/15" means 5..max step 15, like "5-max/15".
      hi = stepStr === undefined ? lo : max;
    }
    if (lo < min || hi > max || lo > hi) throw new Error(`cron: "${part}" out of range ${min}-${max}`);
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  if (values.size === 0) {
    for (let v = min; v <= max; v++) values.add(v);
  }
  return { values: [...values].sort((a, b) => a - b), restricted };
}

function num(s, names) {
  const lower = s.toLowerCase();
  if (names && lower in names) return names[lower];
  const n = Number(s);
  if (!Number.isInteger(n)) throw new Error(`cron: bad value "${s}"`);
  return n;
}

// Parse a 5-field cron expression. Throws Error on anything invalid.
export function parseCron(expr) {
  if (typeof expr !== "string") throw new Error("cron: expression must be a string");
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("cron: expected 5 fields (minute hour day month weekday)");
  const minute = parseField(fields[0], 0, 59);
  const hour = parseField(fields[1], 0, 23);
  const dom = parseField(fields[2], 1, 31);
  const month = parseField(fields[3], 1, 12, MONTHS);
  const dow = parseField(fields[4], 0, 7, DAYS);
  // Cron allows 7 for Sunday; normalize it to 0.
  const dowValues = [...new Set(dow.values.map((v) => (v === 7 ? 0 : v)))].sort((a, b) => a - b);
  return { minute: minute.values, hour: hour.values, dom: dom.values, month: month.values, dow: dowValues, domRestricted: dom.restricted, dowRestricted: dow.restricted };
}

function dayMatches(cron, y, mo, d, weekday) {
  if (!cron.month.includes(mo)) return false;
  const domHit = cron.dom.includes(d);
  const dowHit = cron.dow.includes(weekday);
  if (!cron.domRestricted && !cron.dowRestricted) return true;
  if (cron.domRestricted && !cron.dowRestricted) return domHit;
  if (!cron.domRestricted && cron.dowRestricted) return dowHit;
  return domHit || dowHit; // both restricted: standard cron OR rule
}

// Next matching instant strictly after `from`. Null when nothing
// matches within 366 days (a yearly schedule at most).
export function nextOccurrence(cron, from, tz) {
  const start = tzParts(from, tz);
  const base = Date.UTC(start.year, start.month - 1, start.day);
  for (let off = 0; off <= 366; off++) {
    const dd = new Date(base + off * 86400000);
    const y = dd.getUTCFullYear(), mo = dd.getUTCMonth() + 1, d = dd.getUTCDate();
    if (!dayMatches(cron, y, mo, d, dd.getUTCDay())) continue;
    for (const h of cron.hour) {
      for (const mi of cron.minute) {
        const utc = zonedTimeToUtc(y, mo, d, h, mi, tz);
        if (utc && utc.getTime() > from.getTime()) return utc;
      }
    }
  }
  return null;
}

// Most recent matching instant strictly before `from`.
export function prevOccurrence(cron, from, tz) {
  const start = tzParts(from, tz);
  const base = Date.UTC(start.year, start.month - 1, start.day);
  for (let off = 0; off <= 366; off++) {
    const dd = new Date(base - off * 86400000);
    const y = dd.getUTCFullYear(), mo = dd.getUTCMonth() + 1, d = dd.getUTCDate();
    if (!dayMatches(cron, y, mo, d, dd.getUTCDay())) continue;
    for (let hi = cron.hour.length - 1; hi >= 0; hi--) {
      for (let mi = cron.minute.length - 1; mi >= 0; mi--) {
        const utc = zonedTimeToUtc(y, mo, d, cron.hour[hi], cron.minute[mi], tz);
        if (utc && utc.getTime() < from.getTime()) return utc;
      }
    }
  }
  return null;
}

// Expected window for a cron job: last scheduled time at or before
// now, and the next one after now.
export function cronWindow(cronExpr, tz, now) {
  const cron = parseCron(cronExpr);
  return { last: prevOccurrence(cron, now, tz), next: nextOccurrence(cron, now, tz) };
}

// Expected window for an interval job, anchored on its last start.
// No runs yet means no expectation (the job stays New).
export function intervalWindow(lastStartedAt, periodSeconds, now) {
  if (!lastStartedAt) return { last: null, next: null };
  const period = periodSeconds * 1000;
  const k = Math.floor((now.getTime() - lastStartedAt.getTime()) / period);
  const last = new Date(lastStartedAt.getTime() + Math.max(0, k) * period);
  return { last, next: new Date(last.getTime() + period) };
}
