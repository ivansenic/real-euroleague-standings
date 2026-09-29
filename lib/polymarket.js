// Polymarket per-game markets. Event slugs follow
// `{slugPrefix}-{homeToken}-{awayToken}-{YYYY-MM-DD}`, where tokens are
// Polymarket's own short team names.
export const POLYMARKET_CONFIG = {
  euroleague: {
    seriesId: 10371,
    slugPrefix: "euroleague",
    tokens: {
      ASV: "lyonvill",
      BAR: "barcelon",
      BAS: "baskonia",
      BES: "besiktas",
      DUB: "dubai",
      HTA: "aviv",
      IST: "efes",
      MAD: "madrid",
      MIL: "milano",
      MUN: "munchen",
      OLY: "olympiac",
      PAM: "valencia",
      PAN: "panathin",
      PAR: "partizan",
      PRS: "paris",
      RED: "zvezda",
      TEL: "aviv1",
      ULK: "fenerbah",
      VIR: "bologna",
      ZAL: "kaunas",
    },
  },
};

export function buildSlug(config, homeCode, awayCode, isoDate) {
  const home = config.tokens[homeCode];
  const away = config.tokens[awayCode];
  if (!home || !away) {
    return null;
  }
  return `${config.slugPrefix}-${home}-${away}-${isoDate}`;
}

export function polymarketUrl(slug, ref) {
  const url = `https://polymarket.com/event/${slug}`;
  return ref ? `${url}?r=${encodeURIComponent(ref)}` : url;
}

function parseJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseOddsFromEvents(events) {
  const odds = new Map();
  if (!Array.isArray(events)) {
    return odds;
  }

  for (const event of events) {
    const market = event?.markets?.find(
      (m) => m.sportsMarketType === "moneyline"
    );
    if (!event?.slug || !market) {
      continue;
    }

    const prices = parseJsonArray(market.outcomePrices);
    if (!prices || prices.length !== 2) {
      continue;
    }

    // outcome 0 is the home team, same order as in the slug
    const homePrice = Number(prices[0]);
    if (!Number.isFinite(homePrice) || homePrice < 0 || homePrice > 1) {
      continue;
    }

    const home = Math.round(homePrice * 100);
    odds.set(event.slug, { home, away: 100 - home });
  }

  return odds;
}

export async function fetchPolymarketOdds(config, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(
      `https://gamma-api.polymarket.com/events?series_id=${config.seriesId}&closed=false&limit=100`,
      { next: { revalidate: 5 * 60 } }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return parseOddsFromEvents(await response.json());
  } catch (error) {
    console.error("Failed to fetch Polymarket odds", error);
    return new Map();
  }
}
