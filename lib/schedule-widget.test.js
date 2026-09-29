import assert from "node:assert/strict";
import { test } from "node:test";
import { POLYMARKET_CONFIG } from "./polymarket.js";
import { parseScheduleGames } from "../standings.js";
import { getScheduleWidgetProps } from "./schedule-widget.js";

const scheduleXml = `<schedule>
<item><gameday>1</gameday><date>Sep 24, 2026</date><startime>20:15</startime><game>7</game><homecode>PAN</homecode><hometeam>PANATHINAIKOS AKTOR ATHENS</hometeam><awaycode>PRS</awaycode><awayteam>PARIS BASKETBALL</awayteam><played>true</played></item>
<item><gameday>2</gameday><date>Sep 29, 2026</date><startime>19:00</startime><game>12</game><homecode>IST</homecode><hometeam>ANADOLU EFES ISTANBUL</hometeam><awaycode>MAD</awaycode><awayteam>REAL MADRID</awayteam><played>false</played></item>
</schedule>`;

const resultsXml = `<results>
<game><gamenumber>7</gamenumber><homecode>PAN</homecode><awaycode>PRS</awaycode><homescore>91</homescore><awayscore>72</awayscore><played>true</played></game>
</results>`;

test("getScheduleWidgetProps combines schedule, scores and odds", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => [
      {
        slug: "euroleague-efes-madrid-2026-09-29",
        markets: [{ sportsMarketType: "moneyline", outcomePrices: '["0.4", "0.6"]' }],
      },
    ],
  });
  const { days, defaultIndex } = await getScheduleWidgetProps({
    scheduleGames: parseScheduleGames(scheduleXml),
    resultsXml,
    config: POLYMARKET_CONFIG.euroleague,
    ref: "abc",
    today: "2026-09-29",
    fetchImpl,
  });
  assert.deepEqual(days.map((d) => d.date), ["2026-09-24", "2026-09-29"]);
  assert.equal(days[0].games[0].homeScore, 91);
  assert.equal(days[1].games[0].odds.home, 40);
  assert.equal(
    days[1].games[0].odds.url,
    "https://polymarket.com/event/euroleague-efes-madrid-2026-09-29?r=abc"
  );
  assert.equal(defaultIndex, 1);
});

test("getScheduleWidgetProps uses odds passed in by the caller", async () => {
  const fetchImpl = async () => {
    throw new Error("should not fetch when odds are passed in");
  };
  const odds = Promise.resolve(
    new Map([["euroleague-efes-madrid-2026-09-29", { home: 55, away: 45 }]])
  );
  const { days } = await getScheduleWidgetProps({
    scheduleGames: parseScheduleGames(scheduleXml),
    resultsXml,
    config: POLYMARKET_CONFIG.euroleague,
    ref: "",
    today: "2026-09-29",
    odds,
    fetchImpl,
  });
  assert.equal(days[1].games[0].odds.home, 55);
});
