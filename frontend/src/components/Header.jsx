import { Link, NavLink } from "react-router-dom";
import { Lightning } from "@phosphor-icons/react";

const tabs = [
  { to: "/", label: "Dashboard" },
  { to: "/rigs", label: "Rigs" },
  { to: "/calculator", label: "Calculator" },
  { to: "/coins", label: "Coins" },
  { to: "/mystnodes", label: "Mystnodes" },
  { to: "/wallet", label: "Wallet" },
  { to: "/nodes", label: "Nodes" },
];

const linkClass = ({ isActive }) =>
  `shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  }`;

const NavigationLinks = ({ mobile = false }) => (
  <nav
    aria-label={mobile ? "Mobile navigation" : "Main navigation"}
    className={mobile ? "flex gap-1 overflow-x-auto px-4 pb-3 md:hidden" : "hidden md:flex items-center gap-1"}
  >
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.to === "/"}
        data-testid={`nav-${tab.label.toLowerCase()}`}
        className={linkClass}
      >
        {tab.label}
      </NavLink>
    ))}
  </nav>
);

export const Header = () => (
  <header
    className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl"
    data-testid="app-header"
  >
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <Link to="/" className="flex shrink-0 items-center gap-3" data-testid="brand-link">
        <div className="flex h-9 w-9 items-center justify-center bg-slate-900 text-white">
          <Lightning size={20} weight="fill" />
        </div>
        <div>
          <div className="text-base font-black leading-none tracking-tight">RIG.PROFIT</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
            Money Making Rigs
          </div>
        </div>
      </Link>

      <NavigationLinks />

      <Link
        to="/calculator"
        data-testid="header-cta"
        className="hidden shrink-0 bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-700 sm:inline-flex"
      >
        Run Calc →
      </Link>
    </div>
    <NavigationLinks mobile />
  </header>
);

export default Header;
