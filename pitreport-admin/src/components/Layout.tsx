import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useIdleLogout } from "../hooks/useIdleLogout";
import type { AdminRole } from "../types";

const SESSION_TIMEOUT = 15 * 60; // 15 minutos de inatividade até terminar a sessão

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Avatar com iconografia distinta por tipo de utilizador. */
function RoleAvatar({ role }: { role: AdminRole | null }) {
  const isAdmin = role === "admin";
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
        isAdmin ? "bg-orange" : "bg-navy"
      }`}
      title={isAdmin ? "Administrador" : "Operador"}
      aria-label={isAdmin ? "Administrador" : "Operador"}
    >
      {isAdmin ? (
        // Escudo com visto — autoridade e acesso total
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15a11.96 11.96 0 0 1-8.25-3.29Z"
          />
        </svg>
      ) : (
        // Headset — operador de atendimento
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 14v-2a8 8 0 1 1 16 0v6a3 3 0 0 1-3 3h-3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 14h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 14h-1a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1Z" />
          <circle cx="13.5" cy="21" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user, role } = useAuth();
  const secondsLeft = useIdleLogout(SESSION_TIMEOUT);
  const low = secondsLeft <= 60;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior */}
        <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          {/* Menu (só mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-navy transition-colors cursor-pointer shrink-0"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Esquerda: utilizador + tipo */}
          <div className="flex items-center gap-2 min-w-0">
            <RoleAvatar role={role} />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-navy max-w-[140px] sm:max-w-[220px] md:max-w-none">
                {user?.email ?? "—"}
              </p>
              <p className="text-xs capitalize text-orange/80">
                {role === "admin" ? "Administrador" : role === "operator" ? "Operador" : role ?? ""}
              </p>
            </div>
          </div>

          {/* Direita: contador de sessão + logout */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                low ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"
              }`}
              title="Sessão termina automaticamente por inatividade"
              aria-live="polite"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden md:inline">Sessão:</span>
              <span>{formatTime(secondsLeft)}</span>
            </div>

            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg bg-navy px-2.5 sm:px-3 py-1.5 text-sm font-medium text-white hover:bg-navy/90 transition-colors cursor-pointer"
              aria-label="Terminar sessão"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
              </svg>
              <span className="hidden sm:inline">Terminar sessão</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
