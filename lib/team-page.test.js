import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScheduleGames } from "../standings.js";
import { POLYMARKET_CONFIG } from "./polymarket.js";
import {
  fetchFeed,
  findCompetition,
  getKnownTiebreakers,
  getTeamGames,
  getTeamPageData,
  ordinal,
  orEmptyXml,
} from "./team-page.js";

const game = (gameNumber, homeCode, awayCode, played) => ({
  gameNumber,
  homeCode,
  awayCode,
  played,
});

test("orEmptyXml replaces empty feeds, keeps real ones", () => {
  assert.equal(orEmptyXml(""), "<empty/>");
  assert.equal(orEmptyXml("  \n"), "<empty/>");
  assert.equal(orEmptyXml(undefined), "<empty/>");
  assert.equal(orEmptyXml("<results/>"), "<results/>");
});

test("findCompetition returns the competition whose schedule has the team", () => {
  const games = {
    euroleague: [game(1, "MAD", "IST", false)],
    eurocup: [game(1, "TNF", "LLI", false)],
  };
  assert.equal(findCompetition("IST", games), "euroleague");
  assert.equal(findCompetition("TNF", games), "eurocup");
  assert.equal(findCompetition("XXX", games), null);
});

test("getTeamGames returns last played newest first and next unplayed soonest first", () => {
  const days = [
    { date: "2026-09-24", games: [game(1, "MAD", "IST", true), game(2, "BAR", "OLY", true)] },
    { date: "2026-10-01", games: [game(3, "BAR", "MAD", true)] },
    { date: "2026-10-08", games: [game(4, "MAD", "OLY", true)] },
    { date: "2026-10-09", games: [game(5, "PAN", "MAD", true)] },
    { date: "2026-10-15", games: [game(6, "MAD", "ZAL", false)] },
    { date: "2026-10-22", games: [game(7, "ULK", "MAD", false)] },
    { date: "2026-10-29", games: [game(8, "MAD", "PAR", false)] },
    { date: "2026-11-05", games: [game(9, "RED", "MAD", false)] },
  ];
  const { last, next } = getTeamGames(days, "MAD");
  assert.deepEqual(last.map((g) => g.gameNumber), [5, 4, 3]);
  assert.deepEqual(next.map((g) => g.gameNumber), [6, 7, 8]);
  assert.equal(last[0].date, "2026-10-09");
  assert.equal(next[0].date, "2026-10-15");
});

test("getTeamGames hides unplayed games more than a day in the past", () => {
  const days = [
    { date: "2026-10-03", games: [game(1, "MAD", "IST", false)] }, // postponed
    { date: "2026-10-19", games: [game(2, "MAD", "BAR", false)] }, // yesterday
    { date: "2026-10-22", games: [game(3, "OLY", "MAD", false)] },
  ];
  const { next } = getTeamGames(days, "MAD", "2026-10-20");
  assert.deepEqual(next.map((g) => g.gameNumber), [2, 3]);
});

test("getTeamGames handles fewer than three games", () => {
  const days = [{ date: "2026-09-24", games: [game(1, "MAD", "IST", false)] }];
  const { last, next } = getTeamGames(days, "MAD");
  assert.deepEqual(last, []);
  assert.deepEqual(next.map((g) => g.gameNumber), [1]);
});

test("getKnownTiebreakers classifies decided head-to-heads only", () => {
  const h2h = (wins, losses, ptsFor, ptsAgainst) => ({ wins, losses, ptsFor, ptsAgainst });
  const team = {
    code: "MAD",
    h2h: {
      IST: h2h(2, 0, 170, 150), // 2-0
      BAR: h2h(1, 1, 160, 156), // 1-1, +4
      OLY: h2h(0, 2, 150, 170), // 0-2
      PAN: h2h(1, 1, 150, 153), // 1-1, -3
      ZAL: h2h(1, 1, 160, 160), // 1-1, even: next tiebreaker decides
      ULK: h2h(1, 0, 90, 80), // one game only: not decided
    },
  };
  const standings = ["OLY", "BAR", "MAD", "PAN", "IST", "ZAL", "ULK"].map(
    (code) => ({ code })
  );
  const { positive, negative } = getKnownTiebreakers(team, standings);
  assert.deepEqual(positive, [
    { code: "BAR", wins: 1, losses: 1, diff: 4 },
    { code: "IST", wins: 2, losses: 0, diff: 20 },
  ]);
  assert.deepEqual(negative, [
    { code: "OLY", wins: 0, losses: 2, diff: -20 },
    { code: "PAN", wins: 1, losses: 1, diff: -3 },
  ]);
});


test("ordinal adds English suffixes", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal),
    ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd"]
  );
});

const elSchedule = `<schedule>
<item><gameday>1</gameday><date>Sep 24, 2026</date><startime>20:00</startime><game>1</game><homecode>MAD</homecode><hometeam>REAL MADRID</hometeam><awaycode>IST</awaycode><awayteam>ANADOLU EFES ISTANBUL</awayteam><played>true</played></item>
<item><gameday>2</gameday><date>Oct 1, 2026</date><startime>20:00</startime><game>2</game><homecode>IST</homecode><hometeam>ANADOLU EFES ISTANBUL</hometeam><awaycode>MAD</awaycode><awayteam>REAL MADRID</awayteam><played>true</played></item>
<item><gameday>3</gameday><date>Oct 8, 2026</date><startime>20:00</startime><game>3</game><homecode>BAR</homecode><hometeam>FC BARCELONA</hometeam><awaycode>MAD</awaycode><awayteam>REAL MADRID</awayteam><played>true</played></item>
<item><gameday>4</gameday><date>Oct 15, 2026</date><startime>20:30</startime><game>4</game><homecode>MAD</homecode><hometeam>REAL MADRID</hometeam><awaycode>BAR</awaycode><awayteam>FC BARCELONA</awayteam><played>false</played></item>
</schedule>`;

const elResults = `<results>
<game><gamenumber>1</gamenumber><group>Regular Season</group><hometeam>REAL MADRID</hometeam><homecode>MAD</homecode><homescore>80</homescore><awayteam>ANADOLU EFES ISTANBUL</awayteam><awaycode>IST</awaycode><awayscore>70</awayscore><played>true</played></game>
<game><gamenumber>2</gamenumber><group>Regular Season</group><hometeam>ANADOLU EFES ISTANBUL</hometeam><homecode>IST</homecode><homescore>85</homescore><awayteam>REAL MADRID</awayteam><awaycode>MAD</awaycode><awayscore>80</awayscore><played>true</played></game>
<game><gamenumber>3</gamenumber><group>Regular Season</group><hometeam>FC BARCELONA</hometeam><homecode>BAR</homecode><homescore>90</homescore><awayteam>REAL MADRID</awayteam><awaycode>MAD</awaycode><awayscore>70</awayscore><played>true</played></game>
<game><gamenumber>4</gamenumber><group>Regular Season</group><hometeam>REAL MADRID</hometeam><homecode>MAD</homecode><homescore>0</homescore><awayteam>FC BARCELONA</awayteam><awaycode>BAR</awaycode><awayscore>0</awayscore><played>false</played></game>
</results>`;

test("getTeamPageData combines games, standing and tiebreakers", () => {
  const data = getTeamPageData({
    code: "MAD",
    competition: "euroleague",
    scheduleGames: parseScheduleGames(elSchedule),
    resultsXml: elResults,
    odds: new Map(),
    config: POLYMARKET_CONFIG.euroleague,
    ref: "",
    today: "2026-09-29",
  });
  assert.equal(data.fullName, "REAL MADRID");
  assert.deepEqual(data.last.map((g) => g.gameNumber), [3, 2, 1]);
  assert.equal(data.last[0].homeScore, 90);
  assert.deepEqual(data.next.map((g) => g.gameNumber), [4]);
  // BAR 1-0, IST 1-1, MAD 1-2
  assert.deepEqual(data.standing, { group: null, position: 3, wins: 1, losses: 2 });
  assert.deepEqual(data.tiebreakers, {
    positive: [{ code: "IST", wins: 1, losses: 1, diff: 5 }],
    negative: [],
  });
});

const ecSchedule = `<schedule>
<item><gameday>1</gameday><date>Oct 1, 2026</date><startime>19:00</startime><game>1</game><homecode>TNF</homecode><hometeam>LA LAGUNA TENERIFE</hometeam><awaycode>LLI</awaycode><awayteam>LONDON LIONS</awayteam><played>false</played></item>
</schedule>`;

test("getTeamPageData finds the EuroCup group of the team", () => {
  const results = `<results>
<game><gamenumber>1</gamenumber><group>B</group><hometeam>LA LAGUNA TENERIFE</hometeam><homecode>TNF</homecode><homescore>88</homescore><awayteam>LONDON LIONS</awayteam><awaycode>LLI</awaycode><awayscore>77</awayscore><played>true</played></game>
</results>`;
  const data = getTeamPageData({
    code: "LLI",
    competition: "eurocup",
    scheduleGames: parseScheduleGames(ecSchedule),
    resultsXml: results,
    odds: new Map(),
    config: POLYMARKET_CONFIG.eurocup,
    ref: "",
    today: "2026-09-29",
  });
  assert.deepEqual(data.standing, { group: "B", position: 2, wins: 0, losses: 1 });
});

test("getTeamPageData works before the season starts", () => {
  const data = getTeamPageData({
    code: "TNF",
    competition: "eurocup",
    scheduleGames: parseScheduleGames(ecSchedule),
    resultsXml: orEmptyXml(""),
    odds: new Map(),
    config: POLYMARKET_CONFIG.eurocup,
    ref: "",
    today: "2026-09-29",
  });
  assert.equal(data.fullName, "LA LAGUNA TENERIFE");
  assert.equal(data.standing, null);
  assert.deepEqual(data.last, []);
  assert.deepEqual(data.next.map((g) => g.gameNumber), [1]);
  assert.deepEqual(data.tiebreakers, { positive: [], negative: [] });
});

test("findCompetition throws when every schedule is empty", () => {
  assert.throws(
    () => findCompetition("MAD", { euroleague: [], eurocup: [] }),
    /schedule feeds/
  );
});

test("findCompetition throws when the team is missing and a schedule is empty", () => {
  const games = { euroleague: [game(1, "MAD", "IST", false)], eurocup: [] };
  assert.equal(findCompetition("MAD", games), "euroleague");
  assert.throws(() => findCompetition("TNF", games), /schedule feeds/);
});

test("fetchFeed returns the body of a good response", async () => {
  const fetchImpl = async () => ({ ok: true, text: async () => "<results/>" });
  assert.equal(await fetchFeed("u", fetchImpl), "<results/>");
});

test("fetchFeed turns an empty body into an empty feed", async () => {
  const fetchImpl = async () => ({ ok: true, text: async () => "" });
  assert.equal(await fetchFeed("u", fetchImpl), "<empty/>");
});

// throwing keeps the last good ISR page instead of caching a broken one
test("fetchFeed throws when the feed request fails", async () => {
  const failing = async () => ({ ok: false, status: 502, text: async () => "" });
  await assert.rejects(fetchFeed("u", failing), /502/);
});
