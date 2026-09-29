---
description: Check played games for overtimes and sync the overtime game IDs in standings.js
argument-hint: "[season codes, e.g. E2026 U2026] (default: current seasons in standings.js)"
---

Overtime points must be excluded from point differences in the standings. The IDs of overtime games are kept by hand in `standings.js` (`euroleagueOvertimeGameIDs` and `eurocupOvertimeGameIDs`, keyed by season code). Bring them in line with the official API.

Seasons to check: $ARGUMENTS. If empty, check the season codes used by the default `season` parameter of `generateEuroleagueStandingsFormXml` and `generateEurocupStandingsFormXml` in `standings.js`.

## Steps

1. For each season, list the regular-season overtime games from the v2 API. The first letter of the season code is the competition (`E` = EuroLeague, `U` = EuroCup):

   ```bash
   SEASON=E2026
   curl -s "https://api-live.euroleague.net/v2/competitions/${SEASON:0:1}/seasons/$SEASON/games" | python3 -c '
   import json, sys
   games = [g for g in json.load(sys.stdin)["data"] if g["phaseType"]["code"] == "RS" and g.get("played")]
   ot = sorted(g["gameCode"] for g in games if g["local"]["partials"].get("extraPeriods"))
   print("played:", len(games), "overtime:", ot)'
   ```

   A game went to overtime when `partials.extraPeriods` is not empty. `gameCode` matches `<gamenumber>` in the v1 results XML the app parses.

2. Compare the list with the one in `standings.js` for that season:
   - games the API reports but the file is missing
   - games in the file the API does not report

3. Check every disagreement against a second source, the game header:

   ```bash
   curl -s "https://live.euroleague.net/api/Header?gamecode=<GAME>&seasoncode=<SEASON>"
   ```

   It is overtime when `ScoreQuarter4A == ScoreQuarter4B` and `ScoreExtraTimeA`/`ScoreExtraTimeB` are non-zero. `ScoreExtraTime*` is the cumulative final score, not the OT points.

4. Update the season's array in `standings.js`. Keep it sorted and on one line, like the existing entries. Add the season key if it is missing. Only change entries that both sources agree on. If the sources disagree, leave the entry as it is and report it.

5. Report per season: games played, overtime games found, IDs added or removed (with teams and score), and anything unresolved. Do not commit unless asked.
