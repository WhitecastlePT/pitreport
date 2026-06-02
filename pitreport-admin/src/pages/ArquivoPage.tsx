import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { subscribeArchivedReports, unarchiveReport } from "../services/reports";
import { exportReportsToExcel } from "../utils/exportExcel";
import type { Report } from "../types";

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function addressParts(address: string): string[] {
  if (!address) return [];
  return address.split(",").map((p) => p.trim()).filter((p) => p && p.toLowerCase() !== "portugal");
}
function extractConcelho(address: string): string {
  const parts = addressParts(address);
  return parts[parts.length - 1] ?? "Desconhecido";
}

export default function ArquivoPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterConcelho, setFilterConcelho] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [restoring, setRestoring] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  useEffect(() => {
    return subscribeArchivedReports((data) => {
      setReports(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filterCategory, filterConcelho, search, sortOrder]);

  const categories = useMemo(() => {
    const set = new Set(reports.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [reports]);

  const concelhos = useMemo(() => {
    const set = new Set(reports.map((r) => extractConcelho(r.address)));
    return Array.from(set).sort();
  }, [reports]);

  const filtered = useMemo(() => {
    let result = reports;
    if (filterCategory) result = result.filter((r) => r.category === filterCategory);
    if (filterConcelho) result = result.filter((r) => extractConcelho(r.address) === filterConcelho);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) => r.title.toLowerCase().includes(q) || r.address.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return sortOrder === "desc" ? -diff : diff;
    });
  }, [reports, filterCategory, filterConcelho, search, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  async function handleRestore(id: string) {
    setRestoring(id);
    try {
      await unarchiveReport(id);
    } finally {
      setRestoring(null);
    }
  }

  const hasActiveFilters = search.trim() || filterCategory || filterConcelho || sortOrder !== "desc";
  const tableHeaders = ["Título", "Categoria", "Morada", "Data", "Ações"];

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
              </svg>
              Arquivo
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Denúncias resolvidas e arquivadas</p>
          </div>
          <button
            onClick={() => exportReportsToExcel(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-40 cursor-pointer"
            title={`Exportar ${filtered.length} denúncia(s) arquivadas`}
          >
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar Excel
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Pesquisar por título ou morada..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-orange"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterConcelho}
            onChange={(e) => setFilterConcelho(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
          >
            <option value="">Todos os concelhos</option>
            {concelhos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
          >
            <option value="desc">Mais recente primeiro</option>
            <option value="asc">Mais antiga primeiro</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setFilterCategory(""); setFilterConcelho(""); setSortOrder("desc"); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpar filtros
            </button>
          )}
        </div>

        {/* Contador */}
        <p className="text-sm text-gray-400 mb-3">
          {filtered.length <= PAGE_SIZE ? (
            <>{filtered.length} {filtered.length === 1 ? "denúncia arquivada" : "denúncias arquivadas"}</>
          ) : (
            <>A mostrar {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} denúncias arquivadas</>
          )}
        </p>

        {loading ? (
          <p className="text-gray-400 text-sm">A carregar...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
            </svg>
            <p className="text-sm">Nenhuma denúncia arquivada{hasActiveFilters ? " com estes filtros" : ""}.</p>
          </div>
        ) : (
          <>
            {/* Desktop — tabela */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {tableHeaders.map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pageRows.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-navy max-w-48 truncate">{report.title || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{report.category || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{report.address || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(report.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleRestore(report.id)}
                            disabled={restoring === report.id}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
                          >
                            {restoring === report.id ? "..." : "Repor"}
                          </button>
                          <button
                            onClick={() => navigate(`/reports/${report.id}?from=arquivo`)}
                            className="text-xs font-medium text-orange hover:underline cursor-pointer"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile — cards */}
            <div className="md:hidden space-y-3">
              {pageRows.map((report) => (
                <div key={report.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <dl className="divide-y divide-gray-50">
                    {([
                      ["Título", <span className="font-medium text-navy">{report.title || "—"}</span>],
                      ["Categoria", report.category || "—"],
                      ["Morada", report.address || "—"],
                      ["Data", formatDate(report.createdAt)],
                    ] as [string, React.ReactNode][]).map(([label, value]) => (
                      <div key={label} className="flex gap-3 py-1.5">
                        <dt className="text-xs font-semibold text-gray-400 w-20 shrink-0 pt-0.5">{label}</dt>
                        <dd className="text-sm text-gray-700 flex-1 break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleRestore(report.id)}
                      disabled={restoring === report.id}
                      className="text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
                    >
                      {restoring === report.id ? "A repor..." : "Repor"}
                    </button>
                    <button
                      onClick={() => navigate(`/reports/${report.id}?from=arquivo`)}
                      className="text-xs font-medium text-orange hover:underline cursor-pointer"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Paginação */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === "…" ? (
                    <span key={`e-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition cursor-pointer ${
                        currentPage === p ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Seguinte
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
