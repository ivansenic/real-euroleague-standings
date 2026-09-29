# Team Pages — Design

Date: 2026-09-29

## Goal

Add one page per team showing the team's current season at a glance: last
three results, next three fixtures, and the head-to-head tiebreakers the team
has already won or lost. Link every team in the standings table and the
schedule widget to its page.

## Non-goals

- Season archive pages (`/teams/<slug>/<season>`). Can be added later.
- Full season schedule, player stats, rosters.
- Tiebreakers that are not decided yet (only one h2h game played).
- Playoff / play-in / what-if scenarios.
- Linking teams from the archived calculator pages.

## Findings (verified 2026-09-29)

- A club plays only one competition per season, and clubs move between
  EuroLeague and EuroCup (Paris, Hapoel Tel Aviv, Dubai, Bourg…).
- Team codes are unique across both competitions: 20 EuroLeague codes (E2026)
  and 32 EuroCup codes (U2026), zero overlap. 52 teams total.
- The results feed has team names in upper case with sponsors
  (`FENERBAHCE TARFIN ISTANBUL`). Not usable as a title or slug.
- EuroCup results feed is empty before the season starts; the schedule feed
  already lists all 32 teams.
- EuroLeague is a double round robin (every opponent twice). EuroCup groups of
  eight play a double round robin inside the group.

## Routes

`/teams/<slug>`, e.g. `/teams/real-madrid`, `/teams/hapoel-tel-aviv`.

- Season- and competition-agnostic. Always renders the current season in
  whichever competition the team plays. One stable URL per club collects
  search ranking across seasons and survives competition moves.
- Season appears in title, h1 and description, not the URL.
- Unknown slug → 404 (`dynamicParams = false`).
- No redirects.

## Team registry

`utils/teams.ts`, hand-written:

```ts
export const TEAMS: Record<string, { slug: string; name: string }> = {
  MAD: { slug: "real-madrid", name: "Real Madrid" },
  ULK: { slug: "fenerbahce", name: "Fenerbahce" },
  // … all 52 current codes
};
export const codeToSlug = (code: string) => TEAMS[code]?.slug;
export const slugToCode = (slug: string) => …;
export const teamDisplayName = (code: string) => TEAMS[code]?.name;
```

- Slugs and names are sponsor-free so they stay stable across seasons.
- Registry holds exactly the teams of the current season. Next season: add
  new codes, remove teams that left both competitions (their URL then 404s,
  and the sitemap stays clean).

## Season config

Move the hardcoded `E2026` / `U2026` season codes from `app/page.tsx` and
`app/eurocup/page.tsx` into one shared constant (`lib/season.js`) with
season label `2026/27`. League pages and team pages read from it.

## Data flow (server, `app/teams/[slug]/page.tsx`)

1. `slugToCode(slug)`; `generateStaticParams` returns all registry slugs.
2. Fetch EL and EuroCup schedule feeds (same URLs and 5 min revalidate as
   the league pages, so the fetch cache is shared). Competition = the feed
   whose games contain the code. Code in neither feed → 404.
3. Fetch that competition's results feed and Polymarket odds (parallel).
4. Standings: `generateEuroleagueStandingsFormXml(xml)` or, for EuroCup,
   `generateEurocupStandingsFormXml(xml, group)` for each group until the
   group containing the team is found. Gives position, record and `h2h`.
   Missing team (no games played yet) → no record/position, no tiebreakers.
5. Games: `parseScheduleGames` + `parseResultScores`, enriched the same way
   the schedule widget does (start time in UTC, scores, odds).
6. `revalidate = 300`, matching league pages.

## Pure logic (`lib/team-page.js`, unit tested)

- `getTeamGames(games, code, now)` → `{ last, next }`.
  - `last`: the team's 3 most recent played games, newest first.
  - `next`: the team's next 3 unplayed games, soonest first (live games
    count as `next`).
- `getKnownTiebreakers(team, standings)` → `{ positive, negative }`.
  - Only opponents present in `team.h2h` with `wins + losses === 2`
    (both regular-season games played). For EuroCup `team.h2h` only holds
    group opponents, so no extra filter is needed.
  - Positive: 2-0, or 1-1 with point diff > 0. Negative: 0-2, or 1-1 with
    point diff < 0. 1-1 with diff 0 → left out (goes to the next rule).
  - Each entry: `{ code, wins, losses, diff }`. Sorted by opponent's
    current standings position.

## Page layout

Same shell as league pages (`Navigation`, `Footer`, padding). Accent colour
by competition: orange for EuroLeague, indigo for EuroCup.

1. **Header:** large team logo, display name (h1), `EuroLeague 2026/27`
   (or EuroCup + group), record and position (`4th · 9-3`) when available.
2. **Games**, two columns on `sm+`, stacked on mobile (results first):
   - *Last games:* rows like the schedule widget with the final score (winner
     highlighted in accent), date below the score.
   - *Next games:* rows like the schedule widget with odds pill, date below;
     start time shown only when the game is today (viewer's zone in the
     browser, Berlin on server render, same as the widget). Live games show
     the LIVE badge.
   - Empty column states: "No games played yet" / "No upcoming games".
3. **Known tiebreakers**, two columns: *Won* and *Lost*. Each row: opponent
   logo + name (linked), h2h record and point diff (`2-0 · +17`,
   `1-1 · +4`). Empty state: "No decided head-to-heads yet".
4. Link back to the competition standings (`/` or `/eurocup`).

The widget's `Score`, `Odds`, `TeamName` and row pieces move from
`components/ScheduleWidget.jsx` into a shared `components/GameParts.jsx` so
both widget and team page use them.

## Links to team pages

- Standings table (`components/Standings.jsx`): logo + name cell becomes a
  `Link` to the team page. Row details toggle and prediction `TeamBox`
  buttons stay unchanged.
- Schedule widget: home and away logo + name become links. Odds pill
  unchanged.
- Team page: opponents in games and tiebreaker lists link to their pages.
- Only link when `codeToSlug(code)` exists; otherwise render plain text.

## SEO

- `generateMetadata`: title `Real Madrid – EuroLeague 2026/27 Results,
  Schedule & Tiebreakers`; description including record and position when
  known; canonical `/teams/<slug>`; existing Open Graph image.
- `app/sitemap.ts`: `/`, `/eurocup`, calculator pages, all team pages.

## Error handling

- Feed fetch fails / returns garbage: page renders header from registry and
  empty states (same tolerance as league pages). Odds failure → no odds pills
  (existing behaviour of `fetchPolymarketOdds`).

## Testing

- Unit (`lib/team-page.test.js`): games split and ordering, fewer than 3
  games, live game counted as next, tiebreaker classification (2-0, 0-2,
  1-1 ±, 1-1 zero diff excluded, single game excluded), sorting.
- Unit (`utils/teams.test.*`): slugs unique, `slugToCode(codeToSlug(c))`
  round-trip, registry matches the 52 codes verified above (hardcoded list in
  the test, no network).
- Manual: `yarn build`, open an EL team, a EuroCup team, a bad slug (404);
  check links from standings and widget.
