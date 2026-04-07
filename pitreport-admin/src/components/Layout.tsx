import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        {/* Barra superior mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-navy transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            <img src="/favicon.png" alt="PitReport" className="h-6 w-6 object-contain" />
            <span className="text-base font-bold text-navy">Pit</span>
            <span className="text-base font-bold text-orange">Report</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
