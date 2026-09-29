import assert from "node:assert/strict";
import { test } from "node:test";
import {
  POLYMARKET_CONFIG,
  buildSlug,
  fetchPolymarketOdds,
  parseOddsFromEvents,
  polymarketUrl,
} from "./polymarket.js";

const el = POLYMARKET_CONFIG.euroleague;

test("euroleague config maps all 20 teams", () => {
  assert.equal(el.seriesId, 10371);
  assert.equal(el.slugPrefix, "euroleague");
  assert.equal(Object.keys(el.tokens).length, 20);
});

test("buildSlug builds home-away-date slug", () => {
  assert.equal(
    buildSlug(el, "IST", "MAD", "2026-09-29"),
    "euroleague-efes-madrid-2026-09-29"
  );
  assert.equal(
    buildSlug(el, "TEL", "BES", "2026-09-30"),
    "euroleague-aviv1-besiktas-2026-09-30"
  );
});

test("buildSlug returns null for unknown team", () => {
  assert.equal(buildSlug(el, "XXX", "MAD", "2026-09-29"), null);
});

test("polymarketUrl adds encoded ref only when set", () => {
  assert.equal(
    polymarketUrl("euroleague-efes-madrid-2026-09-29", ""),
    "https://polymarket.com/event/euroleague-efes-madrid-2026-09-29"
  );
  assert.equal(
    polymarketUrl("s", "abc"),
    "https://polymarket.com/event/s?r=abc"
  );
  assert.equal(
    polymarketUrl("s", "a b&c"),
    "https://polymarket.com/event/s?r=a%20b%26c"
  );
});

const moneyline = (prices) => ({
  sportsMarketType: "moneyline",
  outcomePrices: prices,
});

test("parseOddsFromEvents converts moneyline prices to percentages", () => {
  const odds = parseOddsFromEvents([
    { slug: "a", markets: [moneyline('["0.585", "0.415"]')] },
  ]);
  assert.deepEqual(odds.get("a"), { home: 59, away: 41 });
});

test("parseOddsFromEvents skips malformed events", () => {
  const odds = parseOddsFromEvents([
    { slug: "no-markets" },
    { slug: "no-moneyline", markets: [{ sportsMarketType: "spread", outcomePrices: '["0.5","0.5"]' }] },
    { slug: "bad-json", markets: [moneyline("not json")] },
    { slug: "one-price", markets: [moneyline('["0.5"]')] },
    { slug: "nan", markets: [moneyline('["abc", "0.5"]')] },
    { markets: [moneyline('["0.5", "0.5"]')] },
    { slug: "ok", markets: [moneyline('["0.2", "0.8"]')] },
  ]);
  assert.deepEqual([...odds.keys()], ["ok"]);
  assert.deepEqual(odds.get("ok"), { home: 20, away: 80 });
});

test("parseOddsFromEvents handles non-array input", () => {
  assert.equal(parseOddsFromEvents(null).size, 0);
  assert.equal(parseOddsFromEvents({ error: "x" }).size, 0);
});

test("fetchPolymarketOdds requests open events of the series", async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => [{ slug: "a", markets: [moneyline('["0.7","0.3"]')] }],
    };
  };
  const odds = await fetchPolymarketOdds(el, fetchImpl);
  assert.equal(
    calledUrl,
    "https://gamma-api.polymarket.com/events?series_id=10371&closed=false&limit=100"
  );
  assert.deepEqual(odds.get("a"), { home: 70, away: 30 });
});

test("fetchPolymarketOdds returns empty map on failure", async (t) => {
  t.mock.method(console, "error", () => {});
  const rejecting = async () => {
    throw new Error("network");
  };
  const notOk = async () => ({ ok: false, status: 500, json: async () => [] });
  const badJson = async () => ({
    ok: true,
    json: async () => {
      throw new SyntaxError("bad");
    },
  });
  for (const fetchImpl of [rejecting, notOk, badJson]) {
    const odds = await fetchPolymarketOdds(el, fetchImpl);
    assert.equal(odds.size, 0);
  }
});

test("fetchPolymarketOdds gives up on a hanging request", async (t) => {
  t.mock.method(console, "error", () => {});
  let signal;
  const hanging = (url, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(options.signal.reason));
    });
  };
  // AbortSignal.timeout uses an unref'd timer, keep the event loop alive
  const keepAlive = setTimeout(() => {}, 1000);
  const odds = await fetchPolymarketOdds(el, hanging, 20);
  clearTimeout(keepAlive);
  assert.ok(signal, "fetch should receive an abort signal");
  assert.equal(odds.size, 0);
});

test("parseOddsFromEvents skips events with malformed markets", () => {
  const odds = parseOddsFromEvents([
    { slug: "object-markets", markets: { sportsMarketType: "moneyline" } },
    { slug: "null-market", markets: [null, moneyline('["0.6", "0.4"]')] },
    { slug: "ok", markets: [moneyline('["0.3", "0.7"]')] },
  ]);
  assert.deepEqual([...odds.keys()], ["null-market", "ok"]);
});

test("parseOddsFromEvents requires both prices to be valid", () => {
  const odds = parseOddsFromEvents([
    { slug: "bad-away", markets: [moneyline('["0.5", "invalid"]')] },
    { slug: "away-out-of-range", markets: [moneyline('["0.5", "1.5"]')] },
    { slug: "ok", markets: [moneyline('["0.5", "0.5"]')] },
  ]);
  assert.deepEqual([...odds.keys()], ["ok"]);
});

test("eurocup config builds real slugs", () => {
  const ec = POLYMARKET_CONFIG.eurocup;
  assert.equal(ec.seriesId, 11884);
  assert.equal(Object.keys(ec.tokens).length, 30);
  assert.equal(buildSlug(ec, "TNF", "TTK", "2026-09-30"), "bkeurocup-cb2-tur-2026-09-30");
  assert.equal(buildSlug(ec, "LKB", "BOS", "2026-09-30"), "bkeurocup-lie-kk2-2026-09-30");
  assert.equal(buildSlug(ec, "JER", "RTK", "2026-09-29"), "bkeurocup-hap-ros-2026-09-29");
  assert.equal(buildSlug(ec, "BAH", "BCR", "2026-09-30"), null);
});
