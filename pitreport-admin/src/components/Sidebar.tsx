import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AdminRole } from "../types";

interface NavItem {
  to: string;
  label: string;
  roles: AdminRole[];
  icon: React.ReactNode;
}

const links: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    roles: ["admin", "operator"],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Denúncias",
    roles: ["admin", "operator"],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    to: "/analytics",
    label: "Análise",
    roles: ["admin", "operator"],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: "/users",
    label: "Utilizadores",
    roles: ["admin"],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 4a3 3 0 10-6 0" />
      </svg>
    ),
  },
  {
    to: "/operators",
    label: "Operadores",
    roles: ["admin", "operator"],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    to: "/arquivo",
    label: "Arquivo",
    roles: ["admin"],
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
      </svg>
    ),
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { signOut, user, role } = useAuth();
  const visibleLinks = links.filter((l) => role && l.roles.includes(role));

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-60 bg-navy flex flex-col
        transition-transform duration-200 ease-in-out
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto lg:shrink-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center gap-2">
        <img src="/favicon.png" alt="PitReport" className="h-8 w-8 object-contain shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-xl font-bold text-white">Pit</span>
          <span className="text-xl font-bold text-orange">Report</span>
          <span className="text-xs text-white/40 ml-2 font-normal">Gestão</span>
        </div>
        {/* Botão fechar (só mobile) */}
        <button
          onClick={onClose}
          className="lg:hidden text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="Fechar menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-orange text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`
            }
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé com utilizador e logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-xs text-white/40 truncate">{user?.email}</p>
        <p className="text-xs text-orange/70 mb-3 capitalize">{role}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
