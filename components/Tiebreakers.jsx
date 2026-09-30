import { TeamLink } from "@/components/GameParts.jsx";
import { TeamLogo } from "@/components/TeamLogo.jsx";
import { teamDisplayName } from "@/lib/teams.js";

const formatDiff = (n) => (n > 0 ? `+${n}` : `${n}`);

const headerClass = "px-2 py-1.5 font-semibold text-white";
const cellClass = "px-2 py-1.5 text-right tabular-nums text-gray-300";

const List = ({ title, entries }) => (
  <section className="rounded-lg border border-white/10 p-3">
    <h2 className="mb-2 text-center font-semibold text-white">{title}</h2>
    {entries.length === 0 ? (
      <p className="py-4 text-center text-gray-400">None yet</p>
    ) : (
      <table className="w-full">
        <thead>
          <tr>
            <th scope="col" className={`${headerClass} pl-0 text-left`}>
              Opponent
            </th>
            <th scope="col" className={`${headerClass} text-right`}>
              W
            </th>
            <th scope="col" className={`${headerClass} text-right`}>
              L
            </th>
            <th scope="col" className={`${headerClass} pr-0 text-right`}>
              +/-
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.code} className="border-t border-white/5">
              {/* max-w-0 lets the name truncate instead of widening the table */}
              <td className="w-full max-w-0 py-1.5 pr-2">
                <span className="flex items-center gap-2">
                  <TeamLink
                    code={entry.code}
                    className="flex min-w-0 items-center gap-2 text-gray-200 hover:underline"
                  >
                    <TeamLogo code={entry.code} size={20} className="shrink-0" />
                    <span className="truncate">
                      {teamDisplayName(entry.code) ?? entry.code}
                    </span>
                  </TeamLink>
                  {entry.final && (
                    <span
                      title="Both games played, tiebreaker decided"
                      className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-200"
                    >
                      Final
                    </span>
                  )}
                </span>
              </td>
              <td className={cellClass}>{entry.wins}</td>
              <td className={cellClass}>{entry.losses}</td>
              <td className={`${cellClass} pr-0`}>{formatDiff(entry.diff)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
