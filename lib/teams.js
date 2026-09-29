// Teams of the current season, keyed by feed team code. Slugs and names are
// sponsor-free so team page URLs survive sponsor changes. Next season: add
// new codes, remove teams that left both competitions.
export const TEAMS = {
  // EuroLeague
  ASV: { slug: "asvel", name: "ASVEL" },
  BAR: { slug: "barcelona", name: "Barcelona" },
  BAS: { slug: "baskonia", name: "Baskonia" },
  BES: { slug: "besiktas", name: "Besiktas" },
  DUB: { slug: "dubai-basketball", name: "Dubai Basketball" },
  HTA: { slug: "hapoel-tel-aviv", name: "Hapoel Tel Aviv" },
  IST: { slug: "anadolu-efes", name: "Anadolu Efes" },
  MAD: { slug: "real-madrid", name: "Real Madrid" },
  MIL: { slug: "olimpia-milano", name: "Olimpia Milano" },
  MUN: { slug: "bayern-munich", name: "Bayern Munich" },
  OLY: { slug: "olympiacos", name: "Olympiacos" },
  PAM: { slug: "valencia-basket", name: "Valencia Basket" },
  PAN: { slug: "panathinaikos", name: "Panathinaikos" },
  PAR: { slug: "partizan", name: "Partizan" },
  PRS: { slug: "paris-basketball", name: "Paris Basketball" },
  RED: { slug: "crvena-zvezda", name: "Crvena Zvezda" },
  TEL: { slug: "maccabi-tel-aviv", name: "Maccabi Tel Aviv" },
  ULK: { slug: "fenerbahce", name: "Fenerbahce" },
  VIR: { slug: "virtus-bologna", name: "Virtus Bologna" },
  ZAL: { slug: "zalgiris", name: "Zalgiris" },
  // EuroCup
  ARI: { slug: "aris", name: "Aris" },
  BAH: { slug: "bahcesehir-college", name: "Bahcesehir College" },
  BCR: { slug: "roma-basketball", name: "Roma Basketball" },
  BGS: { slug: "san-pablo-burgos", name: "San Pablo Burgos" },
  BLK: { slug: "balkan-botevgrad", name: "Balkan Botevgrad" },
  BOS: { slug: "bosna-sarajevo", name: "Bosna Sarajevo" },
  BOU: { slug: "bourg-en-bresse", name: "Bourg-en-Bresse" },
  BUD: { slug: "buducnost", name: "Buducnost" },
  BUR: { slug: "tofas-bursa", name: "Tofas Bursa" },
  CLU: { slug: "u-bt-cluj-napoca", name: "U-BT Cluj-Napoca" },
  FRA: { slug: "skyliners-frankfurt", name: "Skyliners Frankfurt" },
  JER: { slug: "hapoel-jerusalem", name: "Hapoel Jerusalem" },
  KLA: { slug: "neptunas-klaipeda", name: "Neptunas Klaipeda" },
  LEM: { slug: "le-mans", name: "Le Mans" },
  LJU: { slug: "cedevita-olimpija", name: "Cedevita Olimpija" },
  LKB: { slug: "lietkabelis", name: "Lietkabelis" },
  LLI: { slug: "london-lions", name: "London Lions" },
  MAN: { slug: "manresa", name: "Manresa" },
  MRO: { slug: "maxima-roma", name: "Maxima Roma" },
  NAP: { slug: "napoli-basketball", name: "Napoli Basketball" },
  NIN: { slug: "niners-chemnitz", name: "Niners Chemnitz" },
  PAO: { slug: "paok", name: "PAOK" },
  RIG: { slug: "riga-zelli", name: "Riga Zelli" },
  RTK: { slug: "rostock-seawolves", name: "Rostock Seawolves" },
  SIA: { slug: "siauliai", name: "Siauliai" },
  TNF: { slug: "la-laguna-tenerife", name: "La Laguna Tenerife" },
  TRN: { slug: "trento", name: "Trento" },
  TRT: { slug: "derthona-tortona", name: "Derthona Tortona" },
  TTK: { slug: "turk-telekom", name: "Turk Telekom" },
  ULM: { slug: "ratiopharm-ulm", name: "ratiopharm Ulm" },
  VNC: { slug: "reyer-venezia", name: "Reyer Venezia" },
  WRO: { slug: "slask-wroclaw", name: "Slask Wroclaw" },
};

const SLUG_TO_CODE = new Map(
  Object.entries(TEAMS).map(([code, { slug }]) => [slug, code])
);

export const codeToSlug = (code) => TEAMS[code]?.slug;

export const slugToCode = (slug) => SLUG_TO_CODE.get(slug);

export const teamDisplayName = (code) => TEAMS[code]?.name;

export const teamPath = (code) => {
  const slug = codeToSlug(code);
  return slug ? `/teams/${slug}` : undefined;
};
