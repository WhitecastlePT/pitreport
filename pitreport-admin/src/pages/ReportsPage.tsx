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

/**
 * Tenta extrair o concelho a partir de um endereço geocodificado.
 * Formato típico PT: "Rua X, Localidade, Concelho, Distrito, Portugal"
 * Estratégia: dividir por vírgula, remover "Portugal" e strings vazias,
 * e devolver o penúltimo componente (normalmente o concelho).
 */
function extractConcelho(address: string): string {
  if (!address) return "Desconhecido";
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "portugal");
  return parts[parts.length - 1] ?? "Desconhecido";
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
  const [groupByConcelho, setGroupByConcelho] = useState(false);
  const [collapsedConcelhos, setCollapsedConcelhos] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeAllReports((data) => {
      setReports(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

  // Agrupar por concelho quando o toggle está ativo
  const grouped = useMemo(() => {
    if (!groupByConcelho) return null;
    const map = new Map<string, Report[]>();
    for (const r of filtered) {
      const key = extractConcelho(r.address);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupByConcelho]);

  function toggleConcelho(concelho: string) {
    setCollapsedConcelhos((prev) => {
      const next = new Set(prev);
      if (next.has(concelho)) next.delete(concelho);
      else next.add(concelho);
      return next;
    });
  }

  function toggleAllConcelhos(collapse: boolean) {
    if (!grouped) return;
    setCollapsedConcelhos(collapse ? new Set(grouped.map(([c]) => c)) : new Set());
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
            {groupByConcelho && grouped && (
              <>
                <button
                  onClick={() => toggleAllConcelhos(false)}
                  className="text-sm text-gray-500 hover:text-navy transition cursor-pointer"
                >
                  Expandir todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => toggleAllConcelhos(true)}
                  className="text-sm text-gray-500 hover:text-navy transition cursor-pointer"
                >
                  Colapsar todos
                </button>
                <span className="text-gray-300">|</span>
              </>
            )}
            <button
              onClick={() => { setGroupByConcelho((v) => !v); setCollapsedConcelhos(new Set()); }}
              className={`text-sm font-medium px-4 py-2 rounded-lg border transition cursor-pointer ${
                groupByConcelho
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-gray-600 border-gray-200 hover:border-navy hover:text-navy"
              }`}
            >
              Agrupar por concelho
            </button>
          </div>
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
        </div>

        {/* Contador */}
        <p className="text-sm text-gray-400 mb-3">
          {filtered.length} {filtered.length === 1 ? "denúncia" : "denúncias"}
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
                  ? grouped.map(([concelho, rows]) => {
                      const isCollapsed = collapsedConcelhos.has(concelho);
                      return (
                        <>
                          <tr
                            key={`header-${concelho}`}
                            className="bg-navy/5 cursor-pointer hover:bg-navy/10 transition-colors select-none"
                            onClick={() => toggleConcelho(concelho)}
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
                                  {concelho}
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
                  : filtered.map((r) => <ReportRow key={r.id} report={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
