import assert from "node:assert/strict";
import { test } from "node:test";
import { POLYMARKET_CONFIG } from "./polymarket.js";
import {
  berlinTimeToUtc,
  buildScheduleDays,
  elDateToIso,
  formatDayLabel,
  formatStartTime,
  getGameStatus,
  pickDefaultDateIndex,
  swipeDirection,
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
  homeName: "ANADOLU EFES ISTANBUL",
  awayName: "REAL MADRID",
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

test("buildScheduleDays passes team names through", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({})],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.equal(days[0].games[0].homeName, "ANADOLU EFES ISTANBUL");
  assert.equal(days[0].games[0].awayName, "REAL MADRID");
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

test("berlinTimeToUtc converts Berlin wall clock to UTC", () => {
  // summer time (CEST, UTC+2)
  assert.equal(berlinTimeToUtc("2026-09-29", "20:30"), "2026-09-29T18:30:00.000Z");
  // day before clocks go back
  assert.equal(berlinTimeToUtc("2026-10-24", "20:00"), "2026-10-24T18:00:00.000Z");
  // clocks went back at 03:00 that morning (CET, UTC+1)
  assert.equal(berlinTimeToUtc("2026-10-25", "20:00"), "2026-10-25T19:00:00.000Z");
  // winter time
  assert.equal(berlinTimeToUtc("2027-01-14", "18:00"), "2027-01-14T17:00:00.000Z");
});

test("berlinTimeToUtc returns null for missing or invalid time", () => {
  assert.equal(berlinTimeToUtc("2026-09-29", ""), null);
  assert.equal(berlinTimeToUtc("2026-09-29", "TBD"), null);
});

test("buildScheduleDays adds UTC start time", () => {
  const days = buildScheduleDays({
    scheduleGames: [game({ time: "19:00" }), game({ gameNumber: 2, time: "" })],
    scores: new Map(),
    odds: new Map(),
    config,
    ref: "",
  });
  assert.equal(days[0].games[0].startsAt, null);
  assert.equal(days[0].games[1].startsAt, "2026-09-29T17:00:00.000Z");
});

test("getGameStatus tells scheduled, live and final games apart", () => {
  const startsAt = "2026-09-29T17:00:00.000Z";
  const at = (iso) => new Date(iso).getTime();
  const upcoming = { played: false, startsAt };
  assert.equal(getGameStatus(upcoming, at("2026-09-29T16:59:00Z")), "scheduled");
  assert.equal(getGameStatus(upcoming, at("2026-09-29T17:00:00Z")), "live");
  assert.equal(getGameStatus(upcoming, at("2026-09-29T19:59:00Z")), "live");
  // postponed or feed never updated: stop showing live after 3 hours
  assert.equal(getGameStatus(upcoming, at("2026-09-29T20:00:00Z")), "scheduled");
  assert.equal(getGameStatus({ played: true, startsAt }, at("2026-09-29T18:00:00Z")), "final");
  assert.equal(getGameStatus({ played: false, startsAt: null }, at("2026-09-29T18:00:00Z")), "scheduled");
  // no clock yet (server render)
  assert.equal(getGameStatus(upcoming, null), "scheduled");
});

test("swipeDirection detects horizontal swipes only", () => {
  // finger moves left -> next day
  assert.equal(swipeDirection(-80, 10), 1);
  // finger moves right -> previous day
  assert.equal(swipeDirection(80, -10), -1);
  // too short
  assert.equal(swipeDirection(-30, 0), 0);
  // mostly vertical (page scroll)
  assert.equal(swipeDirection(-60, 90), 0);
  assert.equal(swipeDirection(0, 0), 0);
});

test("formatStartTime shows time in the given zone", () => {
  const berlin = { locale: "en-GB", timeZone: "Europe/Berlin" };
  assert.equal(formatStartTime("2026-09-29T18:30:00.000Z", berlin), "20:30");
  assert.equal(formatStartTime("2027-01-14T17:00:00.000Z", berlin), "18:00");
  assert.equal(
    formatStartTime("2026-09-29T18:30:00.000Z", { locale: "en-GB", timeZone: "Europe/Athens" }),
    "21:30"
  );
});

test("buildScheduleDays matches odds whose slug date is one day off", () => {
  const odds = new Map([
    ["euroleague-efes-madrid-2026-09-28", { home: 45, away: 55 }],
    ["euroleague-besiktas-barcelon-2026-10-01", { home: 30, away: 70 }],
  ]);
  const days = buildScheduleDays({
    scheduleGames: [
      game({ date: "Sep 29, 2026" }),
      game({ gameNumber: 2, homeCode: "BES", awayCode: "BAR", date: "Oct 02, 2026" }),
      game({ gameNumber: 3, homeCode: "MAD", awayCode: "IST", date: "Oct 05, 2026" }),
    ],
    scores: new Map(),
    odds,
    config,
    ref: "",
  });
  assert.deepEqual(days[0].games[0].odds, {
    home: 45,
    away: 55,
    url: "https://polymarket.com/event/euroleague-efes-madrid-2026-09-28",
  });
  assert.equal(
    days[1].games[0].odds.url,
    "https://polymarket.com/event/euroleague-besiktas-barcelon-2026-10-01"
  );
  assert.equal(days[2].games[0].odds, undefined);
});

test("buildScheduleDays prefers the exact date over a neighbouring day", () => {
  const odds = new Map([
    ["euroleague-efes-madrid-2026-09-28", { home: 10, away: 90 }],
    ["euroleague-efes-madrid-2026-09-29", { home: 45, away: 55 }],
    ["euroleague-efes-madrid-2026-09-30", { home: 20, away: 80 }],
  ]);
  const days = buildScheduleDays({
    scheduleGames: [game({})],
    scores: new Map(),
    odds,
    config,
    ref: "",
  });
  assert.equal(days[0].games[0].odds.home, 45);
});
