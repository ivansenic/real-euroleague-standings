import { TeamLink } from "@/components/GameParts.jsx";
import { TeamLogo } from "@/components/TeamLogo.jsx";
import { teamDisplayName } from "@/lib/teams.js";

const formatDiff = (n) => (n > 0 ? `+${n}` : `${n}`);

const List = ({ title, entries }) => (
  <section className="rounded-lg border border-white/10 p-3">
    <h3 className="mb-2 font-semibold text-white">{title}</h3>
    {entries.length === 0 ? (
      <p className="py-2 text-center text-gray-400">None yet</p>
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
  <div className="mb-6 text-sm">
    <h2 className="mb-2 font-semibold text-white">Known tiebreakers</h2>
    {positive.length === 0 && negative.length === 0 ? (
      <p className="rounded-lg border border-white/10 p-4 text-center text-gray-400">
        No decided head-to-heads yet
      </p>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <List title="Won" entries={positive} />
        <List title="Lost" entries={negative} />
      </div>
    )}
  </div>
);

export default KnownTiebreakers;
