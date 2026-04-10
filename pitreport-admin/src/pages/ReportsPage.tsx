import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { subscribeAllReports, updateReportStatus } from "../services/reports";
import type { Report, ReportStatus } from "../types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos os estados" },
  { value: "pending", label: "Pendente" },
  { value: "in_progress", label: "Em progresso" },
  { value: "resolved", label: "Resolvido" },
];

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pendente",
  in_progress: "Em progresso",
  resolved: "Resolvido",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type GroupBy = "" | "rua" | "freguesia" | "concelho";

const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "", label: "Sem agrupamento" },
  { value: "rua", label: "Agrupar por rua" },
  { value: "freguesia", label: "Agrupar por freguesia" },
  { value: "concelho", label: "Agrupar por concelho" },
];

/**
 * Formato típico PT (OSM): "Rua X, Freguesia, Concelho, Distrito, Portugal"
 */
function addressParts(address: string): string[] {
  if (!address) return [];
  return address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "portugal");
}

function extractRua(address: string): string {
  return addressParts(address)[0] ?? "Desconhecida";
}

function extractFreguesia(address: string): string {
  const parts = addressParts(address);
  return parts[1] ?? parts[0] ?? "Desconhecida";
}

function extractConcelho(address: string): string {
  const parts = addressParts(address);
  return parts[parts.length - 1] ?? "Desconhecido";
}

function extractGroup(address: string, groupBy: GroupBy): string {
  if (groupBy === "rua") return extractRua(address);
  if (groupBy === "freguesia") return extractFreguesia(address);
  if (groupBy === "concelho") return extractConcelho(address);
  return "";
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterConcelho, setFilterConcelho] = useState("");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("asc");
  const [groupBy, setGroupBy] = useState<GroupBy>("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 10;

  useEffect(() => {
    const unsubscribe = subscribeAllReports((data) => {
      setReports(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Repor para página 1 sempre que os filtros ou agrupamento mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterCategory, filterConcelho, search, sortOrder, groupBy]);

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
    if (filterStatus) result = result.filter((r) => r.status === filterStatus);
    if (filterCategory) result = result.filter((r) => r.category === filterCategory);
    if (filterConcelho) result = result.filter((r) => extractConcelho(r.address) === filterConcelho);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return sortOrder === "desc" ? -diff : diff;
    });
  }, [reports, filterStatus, filterCategory, filterConcelho, search, sortOrder]);

  const totalPages = groupBy ? 1 : Math.ceil(filtered.length / PAGE_SIZE);

  const pageRows = useMemo(() => {
    if (groupBy) return filtered;
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage, groupBy, PAGE_SIZE]);

  const grouped = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, Report[]>();
    for (const r of filtered) {
      const key = extractGroup(r.address, groupBy);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllGroups(collapse: boolean) {
    if (!grouped) return;
    setCollapsedGroups(collapse ? new Set(grouped.map(([k]) => k)) : new Set());
  }

  async function handleStatusChange(id: string, status: ReportStatus) {
    setUpdating(id);
    try {
      await updateReportStatus(id, status);
    } finally {
      setUpdating(null);
    }
  }

  function ReportRow({ report }: { report: Report }) {
    return (
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 font-medium text-navy max-w-48 truncate">
          {report.title || "—"}
        </td>
        <td className="px-4 py-3 text-gray-600">{report.category || "—"}</td>
        <td className="px-4 py-3 text-gray-500 max-w-48 truncate">
          {report.address || "—"}
        </td>
        <td className="px-4 py-3">
          <select
            value={report.status}
            disabled={updating === report.id}
            onChange={(e) =>
              handleStatusChange(report.id, e.target.value as ReportStatus)
            }
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange disabled:opacity-50"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
          {formatDate(report.createdAt)}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => navigate(`/reports/${report.id}`)}
            className="text-xs font-medium text-orange hover:underline cursor-pointer"
          >
            Ver detalhes
          </button>
        </td>
      </tr>
    );
  }

  const tableHeaders = ["Título", "Categoria", "Morada", "Estado", "Data", "Ações"];

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold text-navy">Denúncias</h1>
          <div className="flex items-center gap-2">
            {groupBy && grouped && (
              <>
                <button
                  onClick={() => toggleAllGroups(false)}
                  className="text-sm text-gray-500 hover:text-navy transition cursor-pointer"
                >
                  Expandir todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => toggleAllGroups(true)}
                  className="text-sm text-gray-500 hover:text-navy transition cursor-pointer"
                >
                  Colapsar todos
                </button>
                <span className="text-gray-300">|</span>
              </>
            )}
            <div className="flex items-center gap-1">
              <select
                value={groupBy}
                onChange={(e) => { setGroupBy(e.target.value as GroupBy); setCollapsedGroups(new Set()); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange bg-white text-gray-600 cursor-pointer"
              >
                {GROUP_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {groupBy && (
                <button
                  onClick={() => { setGroupBy(""); setCollapsedGroups(new Set()); }}
                  title="Limpar agrupamento"
                  className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filtros */}
        {(() => {
          const hasActiveFilters = search.trim() || filterStatus || filterCategory || filterConcelho || sortOrder !== "desc";
          return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Pesquisar por título ou morada..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-orange"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <option value="">Todas as categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={filterConcelho}
                onChange={(e) => setFilterConcelho(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
              >
                <option value="">Todos os concelhos</option>
                {concelhos.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
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
                  onClick={() => { setSearch(""); setFilterStatus(""); setFilterCategory(""); setFilterConcelho(""); setSortOrder("desc"); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpar filtros
                </button>
              )}
            </div>
          );
        })()}

        {/* Contador */}
        <p className="text-sm text-gray-400 mb-3">
          {groupBy || filtered.length <= PAGE_SIZE ? (
            <>{filtered.length} {filtered.length === 1 ? "denúncia" : "denúncias"}</>
          ) : (
            <>
              A mostrar {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} denúncias
            </>
          )}
        </p>

        {/* Tabela */}
        {loading ? (
          <p className="text-gray-400 text-sm">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma denúncia encontrada.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {tableHeaders.map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grouped
                  ? grouped.map(([groupKey, rows]) => {
                      const isCollapsed = collapsedGroups.has(groupKey);
                      return (
                        <>
                          <tr
                            key={`header-${groupKey}`}
                            className="bg-navy/5 cursor-pointer hover:bg-navy/10 transition-colors select-none"
                            onClick={() => toggleGroup(groupKey)}
                          >
                            <td colSpan={6} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <svg
                                  className={`w-4 h-4 text-navy transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                                <span className="text-xs font-semibold text-navy uppercase tracking-wide">
                                  {groupKey}
                                </span>
                                <span className="text-xs font-normal text-gray-400">
                                  ({rows.length} {rows.length === 1 ? "denúncia" : "denúncias"})
                                </span>
                              </div>
                            </td>
                          </tr>
                          {!isCollapsed && rows.map((r) => (
                            <ReportRow key={r.id} report={r} />
                          ))}
                        </>
                      );
                    })
                  : pageRows.map((r) => <ReportRow key={r.id} report={r} />)}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {!loading && !groupBy && totalPages > 1 && (
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
                    <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm select-none">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition cursor-pointer ${
                        currentPage === p
                          ? "bg-navy text-white"
                          : "text-gray-600 hover:bg-gray-100"
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
