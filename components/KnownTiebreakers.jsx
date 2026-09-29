import { TeamLink } from "@/components/GameParts.jsx";
import { TeamLogo } from "@/components/TeamLogo.jsx";
import { teamDisplayName } from "@/lib/teams.js";

const formatDiff = (n) => (n > 0 ? `+${n}` : `${n}`);

const List = ({ title, entries }) => (
  <section className="rounded-lg border border-white/10 p-3">
    <h2 className="mb-2 text-center font-semibold text-white">{title}</h2>
    {entries.length === 0 ? (
      <p className="py-4 text-center text-gray-400">None yet</p>
    ) : (
      <ul>
        {entries.map((entry) => (
          <li
            key={entry.code}
            className="flex items-center justify-between gap-2 border-t border-white/5 py-1.5"
          >
            <TeamLink
              code={entry.code}
              className="flex min-w-0 items-center gap-2 text-gray-200 hover:underline"
            >
              <TeamLogo code={entry.code} size={20} className="shrink-0" />
              <span className="truncate">
                {teamDisplayName(entry.code) ?? entry.code}
              </span>
            </TeamLink>
            <span className="shrink-0 tabular-nums text-gray-300">
              {entry.wins}-{entry.losses} · {formatDiff(entry.diff)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const KnownTiebreakers = ({ positive, negative }) => (
  <div className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
    <List title="Tiebreakers won" entries={positive} />
    <List title="Tiebreakers lost" entries={negative} />
  </div>
);

export default KnownTiebreakers;
