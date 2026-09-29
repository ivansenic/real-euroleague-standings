import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPETITIONS, resultsUrl, scheduleUrl } from "./season.js";

// league and team pages share the fetch cache only if URLs match exactly
test("feed URLs match the ones the league pages always used", () => {
  assert.equal(
    resultsUrl(COMPETITIONS.euroleague.seasonCode),
    "https://api-live.euroleague.net/v1/results?seasoncode=E2026"
  );
  assert.equal(
    scheduleUrl(COMPETITIONS.eurocup.seasonCode),
    "https://api-live.euroleague.net/v1/schedules?seasonCode=U2026"
  );
});
