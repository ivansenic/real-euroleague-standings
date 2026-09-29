import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResultScores, parseScheduleGames } from "../standings.js";

const scheduleXml = `<schedule>
<item><gameday>1</gameday><date>Sep 24, 2026</date><startime>20:15</startime><game>7</game><homecode>PAN</homecode><awaycode>PRS</awaycode><played>true</played></item>
<item><gameday>2</gameday><date>Sep 29, 2026</date><game>12</game><homecode>ZAL</homecode><awaycode>OLY</awaycode><played>false</played></item>
</schedule>`;

test("parseScheduleGames includes start time", () => {
  const games = parseScheduleGames(scheduleXml);
  assert.equal(games[0].time, "20:15");
  assert.equal(games[1].time, "");
});

const resultsXml = `<results>
<game><gamenumber>7</gamenumber><homecode>PAN</homecode><awaycode>PRS</awaycode><homescore>91</homescore><awayscore>72</awayscore><played>true</played></game>
<game><gamenumber>12</gamenumber><homecode>ZAL</homecode><awaycode>OLY</awaycode><homescore>0</homescore><awayscore>0</awayscore><played>false</played></game>
<game><gamenumber>13</gamenumber><homecode>RED</homecode><awaycode>IST</awaycode><homescore></homescore><awayscore>80</awayscore><played>true</played></game>
</results>`;

test("parseResultScores returns scores of played games only", () => {
  const scores = parseResultScores(resultsXml);
  assert.deepEqual(scores.get(7), { homeScore: 91, awayScore: 72 });
  assert.equal(scores.has(12), false);
});

test("parseResultScores skips games with unparsable scores", () => {
  const scores = parseResultScores(resultsXml);
  assert.equal(scores.has(13), false);
});
