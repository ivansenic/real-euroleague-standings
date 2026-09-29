import assert from "node:assert/strict";
import { test } from "node:test";
import { POLYMARKET_CONFIG } from "./polymarket.js";
import {
  buildScheduleDays,
  elDateToIso,
  formatDayLabel,
  pickDefaultDateIndex,
  todayIso,
} from "./schedule.js";

test("elDateToIso parses EL feed dates", () => {
  assert.equal(elDateToIso("Sep 24, 2026"), "2026-09-24");
  assert.equal(elDateToIso("Oct 01, 2026"), "2026-10-01");
  assert.equal(elDateToIso("Jan 5, 2027"), "2027-01-05");
  assert.equal(elDateToIso(""), null);
  assert.equal(elDateToIso("Foo 1, 2026"), null);
});

test("todayIso uses the given time zone", () => {
  // 23:30 UTC on Sep 29 is already Sep 30 in Berlin (CEST, UTC+2)
  const now = new Date("2026-09-29T23:30:00Z");
  assert.equal(todayIso("Europe/Berlin", now), "2026-09-30");
  assert.equal(todayIso("UTC", now), "2026-09-29");
});

test("formatDayLabel formats short weekday, month and day", () => {
  assert.equal(formatDayLabel("2026-10-01"), "Thu, Oct 1");
});

const game = (overrides) => ({
  homeCode: "IST",
  awayCode: "MAD",
  gameNumber: 1,
  gameday: 2,
  played: false,
  date: "Sep 29, 2026",
  time: "19:00",
  ...overrides,
});

const config = POLYMARKET_CONFIG.euroleague;

test("buildScheduleDays groups by date and sorts dates and games", () => {
  const days = buildScheduleDays({
    scheduleGames: [
      game({ gameNumber: 3, date: "Oct 01, 2026", time: "20:00" }),
      game({ gameNumber: 2, time: "20:30" }),
      game({ gameNumber: 1, time: "18:00" }),
      game({ gameNumber: 4, time: "18:00" }),
    ],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.deepEqual(
    days.map((d) => d.date),
    ["2026-09-29", "2026-10-01"]
  );
  assert.deepEqual(
    days[0].games.map((g) => g.gameNumber),
    [1, 4, 2]
  );
});

test("buildScheduleDays attaches odds with referral url to unplayed games", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({})],
    scores: new Map(),
    odds: new Map([["euroleague-efes-madrid-2026-09-29", { home: 51, away: 49 }]]),
    config,
    ref: "abc",
  });
  assert.deepEqual(days[0].games[0].odds, {
    home: 51,
    away: 49,
    url: "https://polymarket.com/event/euroleague-efes-madrid-2026-09-29?r=abc",
  });
});

test("buildScheduleDays shows score and no odds for played games", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ played: true })],
    scores: new Map([[1, { homeScore: 80, awayScore: 75 }]]),
    odds: new Map([["euroleague-efes-madrid-2026-09-29", { home: 51, away: 49 }]]),
    config,
    ref: "abc",
  });
  const g = days[0].games[0];
  assert.equal(g.homeScore, 80);
  assert.equal(g.awayScore, 75);
  assert.equal(g.odds, undefined);
});

test("buildScheduleDays keeps games without odds or with unknown teams", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ homeCode: "XXX" }), game({ gameNumber: 2 })],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.equal(days[0].games.length, 2);
  assert.ok(days[0].games.every((g) => g.odds === undefined));
});

test("buildScheduleDays skips games with unparsable dates", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ date: "" })],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.deepEqual(days, []);
});

test("pickDefaultDateIndex picks today, next date, or last date", () => {
  const days = [{ date: "2026-09-24" }, { date: "2026-09-29" }, { date: "2026-10-01" }];
  assert.equal(pickDefaultDateIndex(days, "2026-09-29"), 1);
  assert.equal(pickDefaultDateIndex(days, "2026-09-30"), 2);
  assert.equal(pickDefaultDateIndex(days, "2026-09-01"), 0);
  assert.equal(pickDefaultDateIndex(days, "2027-06-01"), 2);
  assert.equal(pickDefaultDateIndex([], "2026-09-29"), -1);
});
