# DESIGN-COPY.md: Cron Job Observatory (project 4)

Design blueprint phase. Status: draft for Abdullah's approval at the
fourth gate. No page work exists yet; phase-4 builds page by page from
this document, in the order below. Nothing outside this document gets
built as a product screen.

Sources, in authority order: DESIGN.md (direction and tokens as law),
design-system/tokens.css (exact values), design-system/components.css
(class names used below), PLAN.md sections 0.1 and 0.3 (scope, state
model, alert templates, data model). Where this document decides
something those sources left open, the decision is marked (spec) and
listed again under Gate notes at the end, so the gate can veto it.

## 0. Global rules (every screen)

### App chrome

App pages (dashboard, job detail, docs, settings, onboarding) share
one slim topbar, not a sidebar (spec: full-width tables need the
width, and the chrome stays quiet). Topbar contents, left to right:
radar mark (SVG, ink) plus wordmark "Cron Job Observatory" (14px,
600 weight); nav links Dashboard, Docs, Settings (text links, active
item in ink, inactive in ink-2); project switcher (native select,
`.select`, mono project name); sign out (`.btn-text`). Under 768px
the topbar stacks into two rows: brand plus sign out on row one, nav
plus switcher on row two. Landing and legal pages use the same topbar
with landing links instead (Docs, Sign in, primary CTA "Get your API
key").

App pages have no footer. Landing and legal pages have the footer
specced in sections 1 and 8.

### Page header pattern

Every app page opens with the same header: title (`.title`, 24px,
600), one caption line (`.caption`, 12px, ink-3) carrying context
(counts, project name, or window), primary action right-aligned.
Under 768px the action wraps below the caption. A back link
(`.link`, "Jobs" or "Settings") sits above the title where the page
is a child of another page.

### Banners, in stack order

Page-level banners sit directly under the page header, in this
priority order, all persistent (never dismissible, because each one
names a condition that is still true): monitor-down (`.banner-danger`,
section 9), webhook-unhealthy (`.banner-warning`, section 9),
unsent alerts (`.banner-warning`, section 9), alerts-not-configured
(`.banner-info`, section 2). Each banner carries at most one action
button (`.btn-secondary .btn-sm`, for example "Open settings" or
"Retry sends"). Banners use full hairline borders plus tints, never a
one-sided accent border.

### Toasts

Bottom-right stack (`.toast-stack`). Success, error, and info
variants only. A toast names the result in one line and, where an
action exists, carries one text action. Toasts never carry secrets,
keys, or webhook URLs.

### Data display rules

Numbers render in mono with tabular figures (`.num`). A missing
value renders as a grey dash, never a spinner. A real zero prints as
0. Relative times ("5m ago", "in 4h") are the default in tables;
absolute timestamps appear in detail views and log rows. Status is
always shape plus color plus text (`.status` or `.status-pill`),
never color alone. States: New (hollow circle, grey), Up (check,
green), Late (clock, amber), Down (octagon, red), Timed-out (clock,
red).

### Loading, empty, error (global)

Loading uses skeletons inside the frame the data will fill (`.skeleton`
rows in tables, skeleton blocks for charts and cards), never spinners
on data the user already asked for. Button work in progress uses
`.is-loading` on the button itself, which keeps the button size
stable. Empty sections keep their frame (`.empty`): a title, one
body line, and one CTA. Errors use `.banner-danger` plus a Retry
secondary button where retrying can help; error text names the fix,
never a stack trace or a raw server message.

### Forms

Fields use `.field` with `.field-label`, `.field-hint`, and
`.field-error`. Invalid fields carry `aria-invalid="true"` (red
border) and one error line naming the fix. Primary actions use
`.btn` (ink-filled, dark text). Secondary actions use
`.btn-secondary`. Danger actions use `.btn-danger` (red text, never
filled red) and always pass through a confirm modal. Focus is always
visible (`.focus` ring). Modals trap focus, close on Escape and on
backdrop click, and use the single modal shadow. Motion is 150 to
300ms, transform and opacity only, with reduced motion respected.

### Responsive

Breakpoints for QA are 375px, 768px, and 1440px. Tables never squeeze:
`.table-wrap` scrolls horizontally and columns keep their order at
every width. Table row pitch is 48px on desktop, 56px on touch.
Landing sections stack to one column under 768px. The hero display
type clamps through its token, so headlines fit two lines at every
width.

### Component coverage

The phase-2 set covers every screen below with no new component
work: buttons (primary, secondary, danger text, text, small, loading),
form fields (input, textarea, select, checkbox, switch, error states),
status badges and pills, tick strips, tables (hover, selected,
skeleton, empty), stat strips, banners, modals (including the key
show-once row), toasts, code blocks, log excerpts, empty frames,
skeletons, kv-rows, dividers. Phase-4 composes pages from these
classes; the one non-component piece is the duration chart, which
renders as plain SVG (ink p50 line, hairline grid, no gradients,
no new dependency).

## 1. Landing (`/`)

Public. Answers: what is this, and why should I trust it with my
3am jobs. Same tokens as the app, no separate marketing skin. No
gradient hero, no icon-topped cards, no eyebrow pills.

Sections, in order:

1. Topbar: mark plus wordmark; links Docs and Sign in (`.btn-text`);
   primary CTA "Get your API key" (`.btn`) to `/login`.
2. Hero: display headline "Know the minute a cron job fails."
   (`.display`); one supporting sentence (16px body); a 3-line code
   block (`.code`) showing `wrap("nightly-backup", runBackup)` with a
   Copy button in the code header; primary CTA "Get your API key"
   to `/login`; secondary text link "Read the docs" to `/docs`.
   Below the CTAs, the proof: a cropped real 30-day tick strip
   (`.tick-strip`) from the demo project with the caption "30 days
   of nightly-backup on the demo project". The strip renders from
   real demo data only. Before the launch seed exists, it renders
   hollow ticks with the caption "Waiting for the demo job's first
   runs". Never a mocked strip.
3. How it works: three numbered rows (mono numerals 01, 02, 03 in
   ink-3, not cards with icons), separated by hairlines. Step 1,
   "Add the SDK": one line plus the import line in `.code-inline`.
   Step 2, "Wrap the job": the wrap snippet in a `.code` block with
   Copy. Step 3, "Get the Slack alert": the failure message shape
   in a `.log` block (job name, time, log excerpt, link), marked
   as an example.
4. Pain blocks: three rows in the same numbered pattern. Silent
   failures (the 3am story: a backup fails for a week, nobody
   knows). Failed logs attached (no SSH-ing at dawn to find what
   broke). Missed versus slow (Late versus Down, with one
   `.status-pill` each, honest about what each state detects).
5. Live demo strip: the full 30-day demo tick strip, one failed-log
   excerpt (`.log`), and the Slack message text for that failure,
   captioned as demo data. Same real-data rule as the hero strip:
   hollow ticks and an honest caption until the seed exists.
6. Free note: one `.card` with the text "Free in v1. No card.
   MIT-licensed SDK." plus a text link to `/docs`. Not a pricing
   table; there is nothing to price.
7. FAQ: three questions as section titles with body text below,
   separated by hairlines, all answers visible (no accordion in v1).
   Who monitors the monitor (UptimeRobot on the health endpoint,
   stated plainly). Is this just a dead man's switch (yes, plus the
   wrapper captures what the job did). Alert fatigue (one message
   per incident until recovery; Late never pages).
8. Final CTA: section title plus primary button "Read the docs" to
   `/docs`.
9. Footer: mark plus wordmark, links Docs, Terms, Privacy, and the
   public repo, caption "Free in v1, no card."

States: the landing page is static except the two demo strips.
Strip loading renders a skeleton strip inside its frame. Strip
failure renders the frame with the caption "Demo strip unavailable"
and no fake data. Analytics: `landing_viewed`.

## 2. Dashboard (`/dashboard`)

Signed-in only; signed-out requests redirect to `/login` (307, no
flash of app chrome). Answers: which of my jobs need me right now.

Header: title "Jobs"; caption with counts ("7 jobs, 2 need
attention", mono numbers). No header action button; the topbar
project switcher is the control. When the account has no project at
all, the dashboard redirects to `/onboarding` instead of rendering
an empty page. Settings stays reachable from the topbar in that
state.

Banners, when their conditions hold: webhook-unhealthy, unsent
alerts, alerts-not-configured. The alerts-not-configured banner
(`.banner-info`, "Alerts are not configured yet. Save a Slack
webhook and send a test message.") shows until a webhook is saved
and its test send succeeds, and its action button goes to
`/settings`.

Job table (`.table-wrap`, `.table`), one row per job in the
selected project (project switcher, never a cross-project table).
Sort is fixed in v1 (spec): Down first, then Timed-out, then Late,
then by name. No sort controls. Columns:

- Status: `.status` badge (shape, color, text).
- Job: name (`.job-name`) plus a sub line (`.sub`) with the schedule
  in mono ("0 3 * * *" or "every 5m") and the timezone.
- Failures: consecutive-failure count, mono. 0 prints as 0. New
  jobs with no runs show a dash.
- Last run: relative time, mono. Dash when no run exists.
- Next expected: relative time, mono. Dash for jobs with no
  schedule (these stay New and are excluded from the sweep).
- Avg duration (7d): mono duration. Dash when no finished runs
  exist in the window.
- History: 30-day `.tick-strip`, one tick per day colored by the
  worst status that day, hollow for no runs. Each tick carries a
  title attribute with the date and that day's worst status. No
  custom popover in v1.

Row click (any cell) goes to `/jobs/[id]`. Row hover uses the
raised background. No row checkboxes, no bulk actions in v1.

Table states: loading renders five skeleton rows inside the frame.
Error renders `.banner-danger` ("Could not load jobs.") plus a
Retry secondary button. The empty-jobs state is not an empty table:
it is the waiting-for-first-ping frame (section 3), because the
first ping is minutes away and the code block is the useful thing.

First-green acknowledgment: when a job's first success ping lands
while the dashboard is open, a success toast reads "Nice work,
{job-name} is monitored." and the row turns green. Analytics:
`job_first_green` (first success ping), `first_ping_received`.

## 3. Onboarding (`/onboarding`)

One route, three steps, shown after signup. Answers: how do I get
from zero to a monitored job in under five minutes. A signed-in user
with projects can still reach it from Settings (the "Setup snippet"
action), where it opens at step 3 for the selected project.

Step 1, create project: centered card with one field (project
name, `.input`) and a primary button "Create project". Field error
for an empty name: "Give the project a name." Creating a project
with the same name twice is allowed (names are not unique); the
card hint says so in one line.

Step 2, API key show-once modal: the modal (`.modal`) shows the raw
key once in a `.key-row` (mono, copy button), the warning "This key
is shown once. If you lose it, revoke it in Settings and create a
new one.", and the primary button "I have copied it" which closes
the modal and advances to step 3. The raw key is never rendered
anywhere else, never logged, and never appears in a URL. Closing
the modal by Escape or backdrop click also advances to step 3, and
the key is then unrecoverable except by revoke plus create new;
the modal body states this in one line so the choice is informed.
Analytics: `project_created`, `api_key_created`.

Step 3, pre-filled snippet screen: a card with the exact code block
(`.code`) for this project, the real key already inside it, a Copy
button in the code header, and a text link to `/docs`. Below the
block, one line: "Paste this into your job, run it once, and the
dashboard fills in." plus a primary button "Go to dashboard" to
`/dashboard`. Analytics: `sdk_snippet_copied` when the copy button
is used.

Waiting-for-first-ping dashboard state: when a project has no jobs
yet, `/dashboard` renders this frame instead of the table: the
same pre-filled code block (real key, Copy button), the caption
"Your first start ping creates the first row.", and a text link to
`/docs`. The frame keeps the page header and the banner area, so
the page does not jump when the first job arrives. The first start
ping registers the job as New (hollow circle); the first success
turns the row green with the toast from section 2.

Edge states: a ping arrives while the user is still on the snippet
screen (the dashboard shows it on arrival; no refresh control is
offered because the data loads on navigation). The 11th job for
the account pings (ingest returns 429 `job_limit_reached`; the SDK
logs a diagnostic; the job runs unmonitored; the dashboard shows
nothing for it, and the docs limits section states the 10-job cap).

## 4. Job detail (`/jobs/[id]`)

Answers: what happened, and what do I do. Header: back link "Jobs"
to `/dashboard`; title is the job name; a `.status-pill` for the
current state; a caption line with the schedule in mono (cron
expression or interval), timezone, grace seconds, and max runtime
seconds.

Stat strip (`.stat-strip`, five cells, each with its time window in
`.stat-window`): Status (pill plus text, no window), Success rate
("last 30d"), p95 duration ("last 30d"), Executions ("last 30d"),
Alerts (open count, "unresolved"). A cell with no data shows a grey
dash, never a spinner. The strip loads as skeleton cells while the
numbers load.

Run history (`.card` with a table): columns Time (mono absolute
timestamp), Status (`.status` badge: Success, Failed, Timed-out,
or Missed), Duration (mono), Log (first line of the excerpt in
mono, truncated). A "View log" text button on failed rows expands
the full `.log` block below the row in place. Missed runs render as
synthetic rows, visually distinct: status text "Missed", a sub line
"no ping received, from alerts", and no log button (there is no log
to show, and synthetic rows are never editable). History pages at
25 rows with a "Load more" secondary button (no page numbers in
v1). Empty history (a brand-new job) keeps the frame with the
caption "No runs yet." and a grey dash row, not a spinner.
Analytics: `job_detail_viewed`.

Alert history (`.card` under run history): columns Time (mono),
Kind (Failure, Missed, or Timeout), Message (first line of the
Slack text), Delivery (sent time, or "Queued, retrying", or "Failed
after 24h"). Recovery is not a row here; a resolved alert shows its
resolved time in the Delivery column ("Sent, resolved {time}").
Empty state: frame with "No alerts yet for this job."

Duration chart (`.card`): a plain-SVG p50 line, hairline grid,
mono axis labels, window selector above the chart built from three
buttons (24h, 7d, 30d; the active window uses `.btn`, inactive
windows use `.btn-secondary`). Fewer than two finished runs in the
window renders the frame with "Duration chart needs at least 2
finished runs." Chart loading renders a skeleton block. No p90 or
p99 toggles in v1 (the p50 line ships first; percentile toggles
are the named cut if phase-4 overruns).

Schedule settings (`.card` at the bottom of the page, above the
danger zone): fields for schedule kind (`.select`: cron or
interval), cron expression (`.input.mono`, shown only for kind
cron), interval seconds (number input, shown only for kind
interval), timezone (`.input.mono` for the IANA name), grace seconds
(number input), max runtime seconds (number input). Each field
carries a hint line (for example, the grace hint states the default
rule: 10 percent of the period, clamped between 120 and 3600
seconds). Save is a primary button, Cancel a text button. Save
loading uses `.is-loading` on the button. Save success shows a
toast "Schedule saved." Field errors are inline and name the fix:
"That cron expression does not parse. Example: 0 3 * * *." for a
bad expression, "Unknown IANA timezone." for a bad timezone, "Grace
must be 0 or more." for a negative grace. Editing a schedule
affects expected-run math from the save forward; past runs and
alerts are untouched, and the card hint says so. This section is
the escape hatch for schedules set by `wrap()` options; jobs with
no schedule show the kind field set to "none" with the caption
"This job has no schedule, so it stays New and is excluded from
the missed-run sweep."

Job not found: a bad id, or another account's job id, renders the
same frame: title "Job not found", body "This job does not exist
or belongs to another account.", primary button "Back to jobs".
The two cases share one frame so existence never leaks.

Danger zone (`.card` at the page bottom): a `.btn-danger` text
button "Delete this job" opens the delete confirm modal (section
9). No rename control exists in v1, and the danger zone says so in
one line: "Job names cannot change in v1. The SDK matches jobs by
name."

## 5. Docs (`/docs`)

Public. Answers: how do I wrap a job. Single column, sections
separated by hairlines (`.divider`), body 16px on this page, code
blocks with Copy buttons in their headers. A copied snippet swaps
its button label to "Copied" for two seconds (no toast, so repeated
copies stay quiet). Docs code blocks use the placeholder key
`YOUR_API_KEY`, never a real key; the only place a real key appears
in code is the onboarding snippet screen (section 3).

Sections, in order:

1. Install: the SDK file from the repo (vendored under `/sdk` in
   v1; npm publish is a manual step and is not promised here),
   import line, and the note that the SDK has no dependencies.
2. Wrap a job: the `wrap(name, fn)` snippet, then the
   `wrap(name, { schedule, timezone }, fn)` form with a schedule
   example in the Asia/Karachi timezone. One line each on what the
   three pings are (start, finish with success or error text, and
   the run id that ties them together).
3. Options: a table of the `opts` fields (schedule, timezone)
   with types and defaults. Grace and max runtime are not SDK
   options; they live in the job detail schedule settings.
4. Failure and logs: what the SDK sends on a throw (error text
   plus a capped log excerpt), and the cap stated honestly (bodies
   capped at 32KB, excerpts capped server-side).
5. Missed runs and timeouts: Late versus Down in plain words, the
   grace rule, the max-runtime timeout rule, the DST rule (the
   repeated hour counts as one expected window), and the rule that
   one missed ping never alerts.
6. Limits: 10 jobs per account, 60 pings per minute per key (429
   beyond, treated by the SDK as non-retryable with a diagnostic
   log), pings must be awaited, `process.exit()` inside a wrapped
   job is unsupported, a lost finish ping degrades to Timed-out
   rather than silence.
7. Remove the SDK: delete the `wrap()` calls, revoke the key in
   Settings, and delete the job if it should not alert. The section
   warns in one line that an uninstalled but undeleted job goes
   Late, then Down, and fires one missed alert, because the monitor
   cannot tell uninstallation from an outage.

States: docs is static text, so there is no loading state. A failed
page load falls back to the system error screen (section 9).
Analytics: `docs_viewed`, `sdk_snippet_copied`.

## 6. Settings (`/settings`)

Signed-in only. Answers: keys, webhook, account. One page, stacked
cards in the order below, no tabs in v1. The topbar project
switcher is the project context for the whole page: the keys card
and the webhook card always describe the selected project, and each
card names that project in its header line ("API keys for
{project}").

Projects card: an inline create form (name field plus primary
button "Create project", same component as onboarding step 1) at
the top, then one `.kv-row` per project: name, job count, created
date, and two actions: "Setup snippet" (text link to `/onboarding`
at step 3 for that project) and "Delete" (`.btn-danger` text button
to the project delete modal, section 9). Empty state (no projects
besides the one being created): the frame plus the create form; the
dashboard redirect to `/onboarding` means this state is reached
only by direct navigation.

API keys card: a create form (name field plus primary button
"Create key") at the top, then a table: Name, Created, Last used
("hourly granularity" hint in the card caption; dash when never
used), Actions (Revoke, `.btn-danger` text button). Creating a key
opens the show-once modal from section 3 (same modal, same warning,
same "I have copied it" button). Revoking opens the revoke confirm
modal (section 9). Key rows never show values, only names and
metadata. Success toasts: "Key created." is not shown (the modal
itself is the confirmation); "Key revoked." is shown.

Slack webhook card: one field for the webhook URL. The field masks
its value (password type) with a "Show" text button beside it.
After a save, the field shows only the last four characters of the
stored URL with the caption "Saved. Editing replaces the whole
value." Save is a primary button; Test is a secondary button that
sends a message marked [TEST]. Test success shows a toast "Test
message sent. Check the channel." Test failure renders an inline
field error: "Slack rejected the webhook (HTTP {code}). Check the
URL." Health line under the field: a `.status-pill` ("Healthy" or
"Unhealthy") plus, when sends are failing, the count of unsent
alerts ("3 alerts queued, retrying"). Three consecutive failed
sends flip the pill to Unhealthy and raise the webhook-unhealthy
banner (section 9). Removing the webhook uses a `.btn-danger`
text button "Remove webhook" to the webhook removal modal
(section 9). Analytics: `slack_webhook_saved`, `slack_test_sent`,
`slack_test_failed`.

Monitor status card: `.kv-row` lines for "Last check ran" (relative
time from the monitor heartbeat row; dash when no check has ever
run), "Check cadence" ("every 60s"), and "Health endpoint" (link to
`/api/health`). The card caption states plainly that the monitor
runs on free tiers and that the check loop is the pg_cron tick.
When the last check is older than five minutes (spec), the
monitor-down banner appears above the page (section 9).

Data export card: body text listing exactly what the export
contains (projects, jobs, key metadata but never raw keys, webhook
presence but never the URL, runs, alerts) as one JSON file. One
secondary button "Export my data" triggers the download. Failure
shows an error toast "Export failed. Try again."

Danger zone card: a `.btn-danger` text button "Delete account"
opens the account delete flow (section 9). The card body states
the cascade in one line before the button, so the button is never
a surprise.

Settings states: save buttons use `.is-loading` while saving;
field errors are inline; a failed page load renders the system
error screen (section 9); signed-out access redirects to `/login`.

## 7. Auth (`/login`)

Public, signed-in users redirect to `/dashboard`. Centered card,
one column: title "Sign in", body "Magic link, no password.", one
email field (`.input`, type email), one primary button "Send magic
link". States: sending uses `.is-loading` on the button; sent
replaces the form with a success frame ("Check your inbox.", the
email echoed back, "Resend" text button with the note "Resend
available after 60 seconds."); invalid email shows an inline field
error ("Enter a valid email address."); send failure shows
`.banner-danger` ("Could not send the link. Try again.") above the
form with the form intact. Analytics: `signup_completed` fires on
the first completed sign-in (new account), not on every login.

Callback (`/auth/callback`): exchanging the code renders a skeleton
card with the caption "Signing you in." A failed or expired link
renders an error frame: title "This link did not work.", body
"Links expire and work only once. Request a new one.", primary
button "Back to sign in" to `/login`. No error detail beyond that
is shown.

## 8. Legal (`/terms`, `/privacy`)

Public, landing chrome (topbar plus footer). Layout only; content
is generated then human-reviewed in phase-6. Title (`.title`),
"Last updated" caption line, section headings (`.section-title`)
with body text (16px), hairline dividers between sections, and a
text link back to `/`. No forms, no interactive states beyond
links. The privacy page names the data inventory in its sections
(projects, jobs, runs, alerts, keys metadata, webhook presence)
and the retention windows (success runs 30 days, failure and
missed runs 90 days), because phase-6 review checks those sections
against the real behavior.

## 9. Long tail: banners, deletion, uninstall, system screens

### Banners (exact copy and triggers)

Monitor-down (`.banner-danger`): title "The monitor has not checked
in.", body "Last check ran {relative time}. Alerts may be delayed
until it resumes." Action button "Open settings" to `/settings`.
Trigger: last check older than five minutes (spec). Shows on the
dashboard, job detail, and settings pages. It clears on its own
when a fresh check lands.

Webhook-unhealthy (`.banner-warning`): title "Slack alerts are
unhealthy.", body "{n} alerts are queued and Slack sends are
failing." Action button "Open settings" to `/settings`. Trigger:
three consecutive failed Slack sends for the selected project.
Clears when a send succeeds.

Unsent alerts (`.banner-warning`): title "{n} alerts queued.",
body "Sends are being retried. They give up after 24 hours."
Action button "Retry sends" (fires an immediate retry; failure
keeps the banner and shows an error toast). Trigger: at least one
alert row with no sent time and no send failure, on a project whose
webhook is otherwise healthy. This banner never appears at the same
time as the webhook-unhealthy banner; unhealthy wins.

Alerts-not-configured (`.banner-info`, dashboard only): body
"Alerts are not configured yet. Save a Slack webhook and send a
test message." Action button "Open settings" to `/settings`.
Trigger: the selected project has no webhook, or its test send has
never succeeded. Clears when a test send succeeds.

### Deletion and uninstall patterns

Every destructive action passes through a confirm modal with the
same shape: title naming the thing, a body listing the exact
consequences, Cancel (`.btn-secondary`) on the left, and the
destructive action (`.btn-danger`) on the right. No destructive
action runs on a single click. No destructive action is undone
from the UI in v1; the safety net is soft delete plus retention,
stated in each modal body.

Revoke API key (settings): title "Revoke {key name}?", body
"This takes effect immediately and cannot be undone. Jobs using
this key start failing authentication, and those jobs go Late,
then Down, like any quiet job. Create a new key if the job should
keep reporting." Confirm button "Revoke key". Success toast "Key
revoked."

Delete job (job detail danger zone): title "Delete {job name}?",
body "The job leaves the dashboard immediately. Its runs and
alerts stay until the retention purge (success runs 30 days,
failure and missed runs 90 days). Pings for this name are dropped
until the purge clears it, then the name registers as a new job.
There is no undelete screen in v1." Confirm button "Delete job".
Success redirects to `/dashboard` with a toast "Job deleted."

Delete project (settings): title "Delete {project name}?", body
"The project, its jobs, its keys, and its webhook are deleted.
Runs and alerts follow the same retention windows as a deleted
job. The project leaves the switcher immediately. There is no
undelete screen in v1." Confirm button "Delete project". Success
redirects to `/dashboard` (or `/onboarding` when it was the last
project) with a toast "Project deleted."

Remove webhook (settings): title "Remove the Slack webhook?",
body "Alerts stop for this project, and the dashboard warning
returns. Queued unsent alerts are dropped. The removal is
immediate." Confirm button "Remove webhook". Success toast
"Webhook removed."

Delete account (settings danger zone): two steps. Step 1 modal:
title "Delete your account?", body listing the cascade ("Every
project, job, run, alert, key, and webhook on this account is
deleted. Exports stop working after deletion, so export first if
you need the data."). The step 1 action button is "Continue"
(`.btn-secondary`, not danger, because step 1 deletes nothing).
Step 2 modal: title "Type DELETE to confirm.", body repeating the
cascade in one line, a text field that must contain exactly DELETE
(the confirm button stays disabled until it does), Cancel
secondary, confirm `.btn-danger` "Delete my account". Success
signs the user out and redirects to `/` with a one-time info
banner "Your account and data are deleted." No recovery path is
offered; the typed confirmation plus the export warning are the
safeguards.

SDK uninstall (docs, section 5): no modal, because uninstallation
happens in the user's own code. The docs section carries the full
pattern: remove `wrap()` calls, revoke the key, delete the job if
it should not alert. The warning about the Late then Down
sequence after an uninstall is part of that section, not a banner,
because the dashboard cannot distinguish an uninstall from an
outage.

### System screens

Not found (any unknown route): centered frame, title "Page not
found.", body "This page does not exist or moved.", primary
button "Back to dashboard" for signed-in users ("Back to home"
for signed-out users, to `/`). No sitemap, no search box in v1.

Error (route failure): centered frame, title "Something went
wrong.", body "Try again. If it keeps failing, the monitor status
on the settings page shows whether the service itself is down.",
secondary button "Retry" plus a text link to `/dashboard`. Never
a stack trace, never a raw server message.

Signed-out access: every app route redirects to `/login` (307)
before rendering anything. There is no signed-out preview of app
pages.

API or database outage: dashboard, job detail, and settings each
show `.banner-danger` ("Could not reach the service.") plus a
Retry button, with their frames intact. The landing page keeps
rendering (its strips fall back to the captions from section 1)
because it does not need the database to explain the product.

## 10. States matrix (phase-4 and phase-5 checklist)

Each row is a screen times a state. Phase-4 builds every cell;
phase-5 screenshots every cell. "n/a" means the state cannot occur
there.

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Landing | Skeleton demo strips only | Hollow demo strips with honest caption | Strip caption "Demo strip unavailable" |
| Dashboard | 5 skeleton table rows | Waiting-for-first-ping frame | Banner plus Retry |
| Onboarding step 1 | Button loading | n/a (form always shows) | Inline field error |
| Onboarding step 2 (key modal) | n/a (key already issued) | n/a | Modal never shows on failure; creation error is a banner on step 1 |
| Onboarding step 3 (snippet) | n/a (static code) | n/a | n/a |
| Job detail stats | Skeleton stat cells | Grey dashes per cell | Banner plus Retry |
| Job detail run history | Skeleton rows | Frame plus "No runs yet." | Banner plus Retry |
| Job detail alert history | Skeleton rows | Frame plus "No alerts yet for this job." | Banner plus Retry |
| Job detail duration chart | Skeleton block | Frame plus "needs at least 2 finished runs" | Banner plus Retry |
| Job detail schedule form | Button loading on Save | n/a (defaults prefilled) | Inline field errors |
| Job detail not found | n/a | n/a | "Job not found" frame |
| Docs | n/a (static) | n/a | System error screen |
| Settings projects | Skeleton rows | Frame plus create form | Banner plus Retry |
| Settings keys | Skeleton rows | Frame plus create form | Banner plus Retry |
| Settings webhook | Button loading on Save and Test | Masked field with "no webhook saved" caption | Inline field error on test failure |
| Settings monitor | Skeleton kv-rows | Grey dash for "Last check ran" | Banner plus Retry |
| Settings export | Button loading | n/a | Error toast |
| Login | Button loading | n/a (form always shows) | Inline error plus banner on send failure |
| Callback | Skeleton card | n/a | "This link did not work." frame |
| Legal | n/a (static) | n/a | System error screen |
| Not found | n/a | n/a | The 404 frame itself |
| Error screen | n/a | n/a | The error frame itself |

## 11. Analytics event map (from PLAN 0.5, placed)

Server-side where the data lives, instrumented as built, never
retrofitted. Client events fire from the named screen only.

| Event | Trigger screen |
|---|---|
| landing_viewed | Landing, on view |
| docs_viewed | Docs, on view |
| signup_completed | Login callback, first completed sign-in only |
| project_created | Onboarding step 1, on success |
| api_key_created | Onboarding step 2 and settings keys, on success |
| sdk_snippet_copied | Onboarding step 3 and docs code blocks, on copy |
| first_ping_received | Server, first start ping for a project |
| job_first_green | Server, first success ping for a job (dashboard toast mirrors it) |
| job_first_alert | Server, first real alert for a job |
| slack_webhook_saved | Settings webhook, on save |
| slack_test_sent | Settings webhook, on test success |
| slack_test_failed | Settings webhook, on test failure |
| alert_sent | Server, Slack send attempted |
| alert_delivered | Server, Slack send confirmed |
| alert_delivery_failed | Server, Slack send failed |
| alert_recovered | Server, recovery message sent |
| job_detail_viewed | Job detail, on view |

## 12. Phase-4 build order

Build in this document's order: landing, login plus callback,
onboarding, dashboard, job detail, docs, settings, legal, system
screens. Each screen is checked against its section here before
moving to the next. The states matrix (section 10) is the
completion check per screen: a screen is done when every
applicable cell renders.

## Gate notes (judgment calls for Abdullah)

These are the decisions this blueprint made where DESIGN.md and
PLAN.md left the choice open. Each stands unless the gate vetoes
it.

1. Topbar, not sidebar, for app chrome. Reason: the job table is
   dense and full-width, and a sidebar would squeeze the column
   the product is about.
2. One `/onboarding` route with three steps, reused from Settings
   via "Setup snippet". Reason: the first-run flow is one journey,
   and a second create-project screen would duplicate it.
3. Fixed urgency sort on the dashboard, no sort controls in v1.
   Reason: the sort order is the product's point of view (needs
   attention first), and controls would let the user hide a Down
   job below healthy ones.
4. Job delete quarantines the name until the retention purge (90
   days), then the name can register fresh. Reason: without this,
   a ping would silently resurrect a deleted job.
5. Account delete needs the typed word DELETE across two modal
   steps. Reason: one click is too cheap for an irreversible,
   account-wide delete, and there is no undelete screen in v1.
6. Monitor-down banner threshold is five minutes without a check.
   Reason: the tick runs every 60 seconds, so five missed ticks
   means the loop itself is in trouble, not one slow tick.
7. Docs snippets use the placeholder key; the only real key in
   code is the onboarding snippet. Reason: docs pages are public
   and get copied into issues and chats.
8. No new components beyond the phase-2 set. The duration chart is
   plain SVG in phase-4, not a component-system addition.
