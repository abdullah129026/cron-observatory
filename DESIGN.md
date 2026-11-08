# DESIGN.md — Cron Job Observatory (project 4)

Phase-1 design decisions. Status: decided by the build run, needs
Abdullah's approval at the gate before phase-2. No code exists yet.

## 1. Design language (one committed direction)

**Night watch.** The product watches jobs that run at 3am, so it looks
like it belongs at 3am: a near-black ground, dense scannable tables,
status that reads in peripheral vision. Color goes on data (job
states), never on chrome. Chrome is flat and quiet: one ground, one
surface, one hairline.

The point of view: you arrive in a hurry because something is wrong.
So the interface is sorted by urgency before anything else. Needs
attention first, everything else after. Zeros print as zeros, missing
values as a grey dash, never a spinner where a number belongs.

This is a deliberate break from Healthchecks (light, passive) and a
nod to the operators the product serves: their jobs fail in the dark,
and this is the one light on the desk.

**Signature element.** The tick strip. One tick per day for 30 days,
colored by the worst status that day, hollow for no runs. It sits in
the job table as the last column and grows into the 90-day strip on
the job detail page. The landing page shows a real cropped tick strip
of the demo project as its proof, not a mock dashboard.

**Product mark.** A radar-sweep circle: one ring with a single hand at
two o'clock, drawn in ink on the near-black ground. Favicon, header,
footer. No black square with a letter.

## 2. Design tokens (law)

Everything below is exact. Phase-2 components reference tokens only.

### Palette (dark-first, no light theme in v1)

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#0A0D13` | page ground |
| `--surface` | `#10151E` | cards, table body |
| `--raised` | `#161C28` | modals, popovers, hover rows |
| `--ink` | `#E9EDF3` | primary text |
| `--ink-2` | `#A7B0BE` | secondary text |
| `--ink-3` | `#8A94A3` | faint text, placeholder |
| `--line` | `#222B3B` | 1px hairlines, borders |
| `--up` | `#34D399` | state: up (green) |
| `--late` | `#FBBF24` | state: late (amber) |
| `--down` | `#F87171` | state: down (red) |
| `--new` | `#9CA3AF` | state: new (grey; lightened from `#6B7280` in phase-5, which was 4.0:1 on `--bg` and failed WCAG AA for the badge text) |
| `--focus` | `#7DD3FC` | focus ring only, never data |

Primary action button: filled `--ink` with `#0A0D13` text. Green is
reserved for health data, red for failure data, so CTAs do not borrow
either. Secondary actions are text buttons or hairline-bordered
buttons. Danger actions (revoke key, delete account) are text buttons
in `--down` with a confirm step, never filled red.

### State shapes (identical in table, tick strip, detail, Slack text)

| State | Shape | Color | Slack text |
|---|---|---|---|
| New | hollow circle | `--new` | New |
| Up | check in circle | `--up` | Up |
| Late | clock | `--late` | Late |
| Down | octagon | `--down` | Down |
| Timed-out | clock | `--down` | Timed out |

Shape plus color plus text, never color alone. From PLAN 0.1, binding.

### Type

Inter (via next/font, properly loaded) for everything human.
JetBrains Mono (400/500/600) for everything machine: cron
expressions, timestamps, durations, API keys, code snippets, numeric
table columns (tabular figures).

Scale:

| Token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `--text-display` | clamp(40px, 6vw, 64px) | 600 | -0.03em | landing hero only |
| `--text-title` | 24px | 600 | -0.01em | page titles |
| `--text-section` | 16px | 600 | 0 | section headings |
| `--text-body` | 14px | 400 | 0 | app body (16px on landing) |
| `--text-table` | 13px | 400 | 0 | table cells, mono for numbers |
| `--text-caption` | 12px | 400 | 0 | hints, metadata, empty states |

Two typefaces at most, always these two. Headlines fit two lines at
every width.

### Spacing, radius, shadow

Spacing scale: 4, 8, 12, 16, 24, 32, 48. Section gaps 48-64px on
desktop. Table row pitch 48px desktop, 56px on touch.

Radius: 6px for cards, inputs, buttons. 999px for status dots and
pills. Decided once, used everywhere.

Shadows: none on surfaces at rest (separation is the 1px `--line` or
one tone step). The API-key show-once modal and popovers get one
shadow: `0 16px 48px rgba(0,0,0,0.5)`. Nothing else floats.

### Icons

Lucide, stroke 1.75, 16px in the app (20px for page-level actions).
No emoji anywhere. Status uses the state shapes above, not generic
dots.

### Rules that stay standing

- Never a colored one-sided accent border on any component. Full
  hairline borders, background tints, or badges instead.
- No gradients, no glows, no glass, no icon-topped feature cards.
- Empty sections keep their frame. Loading uses skeletons, not
  spinners, on data the user already asked for.
- 150-300ms transitions, transform and opacity only, with
  prefers-reduced-motion respected.

## 3. Screens (inventory, answered question first)

1. **Landing** (`/`): what is this and why should I trust it with my
   3am jobs. Hero (pitch + 3-line snippet + CTA), how-it-works, three
   pain-tied blocks, real demo strip, free note, FAQ, CTA to docs.
2. **Dashboard** (`/dashboard`): which of my jobs need me right now.
   One dense table per the selected project: status, name,
   consecutive failures, schedule, last run, next expected run, avg
   duration (7d), tick strip. Sort: Down, Timed-out, Late first, then
   name.
3. **Job detail** (`/jobs/[id]`): what happened and what do I do.
   Stat strip (status, success rate, p95 duration, executions,
   alerts, each with its time window), run history with failed logs,
   alert history, duration chart (p50 line, 24h/7d/30d), schedule
   settings.
4. **Docs** (`/docs`): how do I wrap a job. Install, wrap() usage,
   copy-paste snippets, honest limits.
5. **Settings** (`/settings`): keys, webhook, account. Projects,
   API keys (create with show-once modal, revoke), Slack webhook
   with test button and health badge, monitor status ("last check
   ran X ago"), export, delete account.
6. **Auth** (`/login`): magic link, one field, one button.
7. **Legal** (`/terms`, `/privacy`): generated, human-reviewed.

## 4. User flows

### Flow 1: First ping to first green row (onboarding)

Signup (magic link) -> create project -> API key show-once modal
(raw key, copy button, "I have copied it" acknowledgment, warning
that it cannot be recovered) -> pre-filled snippet screen (the real
key already in the code block, copy button, docs link) -> dashboard
in "waiting for first ping" state (the exact code block shown, not an
empty table) -> first start ping registers the job as New (hollow
circle) -> first success ping turns the row green with one small
acknowledgment line ("Nice work, backup is monitored"). Target:
under 5 minutes, following only the docs page.

Edge states: ping arrives while the user is still on the snippet
screen (the dashboard updates live on return; no "refresh" needed);
user closes the key modal without copying (recovery is revoke plus
create new, stated in the modal); user loses the key later (same:
revoke, create new); the 11th job for the account pings (429
job_limit_reached, SDK logs a diagnostic, the job runs unmonitored).

### Flow 2: A job fails, Slack gets one message

Finish ping with an error -> alert row claimed (one per job per
incident) -> Slack message in `after()`: job name, project, time,
log excerpt capped, link to job detail -> dashboard row flips to
Down with the red octagon and moves to the top of the table -> user
fixes the job -> next success ping resolves the alert and sends one
recovery message ("Backup is green again") -> alert re-arms.

Edge states: Slack send fails (alert row stays unsent with a visible
count; the check tick retries with backoff, gives up after 24h);
three consecutive send failures mark the webhook unhealthy (badge on
the project, banner in settings); test send fails (inline error
under the field: "Slack rejected the webhook (HTTP {code}). Check
the URL."); a second failure before recovery (no new message, the
incident is already open).

### Flow 3: A job goes quiet (missed run)

Expected run passes with no start ping -> job enters Late (amber
clock, no alert) -> grace expires -> Down (missed): one Slack message
(job name, expected time vs last seen, link) -> a start ping arrives
(the job is running again; the missed alert resolves silently) or a
success ping arrives (full recovery message, re-arm).

Edge states: job has no schedule (stays New forever, excluded from
the sweep); DST repeated hour (one expected window, documented);
a single missed ping with retries on the ping path (never alerts on
one ping); pg_cron tick fails (the next tick recomputes from
expected times, self-heals, only alert latency suffers).

### Flow 4: Triaging a Down job

Dashboard (Down jobs already at the top) -> click the row -> job
detail: stat strip first, run history with the failed log excerpt,
the alert that fired, the 90-day tick strip -> follow the link from
the Slack message to the same page -> fix the code -> next run
succeeds -> row goes green, recovery message sent.

Edge states: missed runs render as synthetic entries in run history
(visually distinct, from the alerts table, never editable); a finish
ping arrives after a timeout alert (duration and logs update, status
stays timed out, no re-fire); the run history for a brand-new job
shows the frame with a grey dash, not a spinner.

### Flow 5: Wiring Slack and keys (settings)

Settings -> Slack webhook field, save, test button -> test message
marked [TEST] lands in the channel -> dashboard drops the "alerts
not configured" warning. Keys tab -> create key (name it, show-once
modal) -> last-used column updates hourly -> revoke a key (confirm
step, stated as immediate).

Edge states: test send while a send is already failing (the health
badge and the banner both name the count of unsent alerts);
revoking a key that a live job uses (the job's pings start 401ing,
the SDK logs a diagnostic, the job goes Late then Down like any
quiet job).

## 5. Landing direction

Dark, same tokens, no separate marketing skin. First screen: the
pitch as the headline ("Know the minute a cron job fails."), one
supporting sentence, the real 3-line snippet in a code block, one
CTA ("Get your API key"). The hero's proof is a cropped real tick
strip from the demo project. Sections follow PLAN 0.5 in order. No
gradient hero, no icon-topped cards, no eyebrow pills. The footer
closes with the mark at full width.

## 6. Left for later phases

Phase-2 decides the exact component inventory (table, tick strip,
stat strip, modal, toast, form field states). The design-copy phase
specs every screen against the approved system, including the long
tail: key-revocation confirm, delete-account flow, monitor-down
banner, webhook-unhealthy banner, all empty and error states. This
document is the direction; those phases are the detail.
