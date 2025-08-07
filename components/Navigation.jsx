"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navigation = () => {
  const pathname = usePathname();
  return (
    <div className="pb-8">
        <nav className="flex border-b border-white/10 py-4">
          <ul
            role="list"
            className="flex min-w-full flex-none gap-x-8 px-2 text-sm/6 font-semibold text-gray-400"
          >
            <li>
              <Link
                href={"/"}
                className={pathname === "/" ? "text-orange-400" : ""}
              >
                {"EuroLeague"}
              </Link>
            </li>
            <li>
              <Link
                href={"/eurocup"}
                className={pathname === "/eurocup" ? "text-indigo-400" : ""}
              >
                {"EuroCup"}
              </Link>
            </li>
          </ul>
        </nav>
    </div>
  );
};

export default Navigation;
