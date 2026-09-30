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
            <span className="flex shrink-0 items-center gap-2 tabular-nums text-gray-300">
              {entry.final && (
                <span
                  title="Both games played, tiebreaker decided"
                  className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200"
                >
                  Final
                </span>
              )}
              {entry.wins}-{entry.losses} · {formatDiff(entry.diff)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const Tiebreakers = ({ positive, negative }) => (
  <div className="mb-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
    <List title="Positive tiebreakers" entries={positive} />
    <List title="Negative tiebreakers" entries={negative} />
  </div>
);

export default Tiebreakers;
