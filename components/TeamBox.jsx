import { teamCodeToAbbreviation } from "@/utils/utils";
import classNames from "classnames";
import Image from "next/image";

export const TeamBox = (props) => {
    const { code, name, showIcon, enabled, selected, onSelected, className } = props;
    return (
      <div className={classNames("flex items-center", className)}>
        <button
          key={code}
          disabled={!enabled}
          type="button"
          className={classNames(
            "rounded-full inline-flex px-2 py-1.5 text-sm font-semibold text-white shadow-sm hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed",
            selected && "bg-gray-700"
          )}
          onClick={onSelected}
        >
          {showIcon && (
            <Image
              src={`/images/team-logos/${code}.webp`}
              width={20}
              height={20}
              alt={teamCodeToAbbreviation(code)}
              className="mr-1"
            />
          )}
          <span>{name || teamCodeToAbbreviation(code)}</span>
        </button>
      </div>
    );
  };
