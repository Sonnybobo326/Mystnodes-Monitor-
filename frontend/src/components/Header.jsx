import { Link, NavLink } from "react-router-dom";
import { Lightning } from "@phosphor-icons/react";

const tabs = [
  { to: "/", label: "Dashboard" },
  { to: "/rigs", label: "Rigs" },
  { to: "/calculator", label: "Calculator" },
  { to: "/coins", label: "Coins" },
  { to: "/nodes", label: "Nodes" },
];

export const Header = () => (
  <header
    className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200"
    data-testid="app-header"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3" data-testid="brand-link">
        <div className="h-9 w-9 bg-slate-900 text-white flex items-center justify-center">
          <Lightning size={20} weight="fill" />
        </div>
        <div>
          <div className="font-black text-base leading-none tracking-tight">RIG.PROFIT</div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">
            Money Making Rigs
          </div>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "/"}
            data-testid={`nav-${t.label.toLowerCase()}`}
            className={({ isActive }) =>
              `px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Link
        to="/calculator"
        data-testid="header-cta"
        className="bg-emerald-600 text-white hover:bg-emerald-700 transition-colors px-5 py-2.5 font-bold text-xs uppercase tracking-wider"
      >
        Run Calc →
      </Link>
    </div>
  </header>
);

export default Header;
