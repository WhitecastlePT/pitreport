import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "../components/Layout";
import { subscribeAllReports } from "../services/reports";
import type { Report } from "../types";

const CATEGORY_COLORS = [
  "#F5A623", "#3B82F6", "#22C55E", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

function extractZone(address: string): string {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  // Estrutura típica: "Rua X, Freguesia, Município, País"
  // Usar o 2.º segmento (freguesia/bairro) ou o 1.º se só existir um
  return parts[1] ?? parts[0] ?? "Desconhecida";
}

export default function AnalyticsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAllReports((data) => {
      setReports(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const { categoryData, topZones } = useMemo(() => {
    // --- Por categoria ---
    const byCategory = reports.reduce<Record<string, number>>((acc, r) => {
      const cat = r.category || "Sem categoria";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {});

    const categoryData = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name,
        value,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));

    // --- Top zonas ---
    const byZone = reports.reduce<Record<string, number>>((acc, r) => {
      if (!r.address) return acc;
      const zone = extractZone(r.address);
      acc[zone] = (acc[zone] ?? 0) + 1;
      return acc;
    }, {});

    const topZones = Object.entries(byZone)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([zone, count]) => ({ zone, count }));

    return { categoryData, topZones };
  }, [reports]);

  const total = reports.length;

  if (loading) {
    return <Layout><p className="p-8 text-gray-400">A carregar...</p></Layout>;
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-navy mb-6">Análise</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Denúncias por categoria — gráfico */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-navy mb-1">
              Denúncias por categoria
            </h2>
            <p className="text-xs text-gray-400 mb-4">{total} denúncias no total</p>

            {categoryData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={categoryData}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip formatter={(value) => [value, "Denúncias"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top zonas problemáticas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-navy mb-1">
              Top zonas problemáticas
            </h2>
            <p className="text-xs text-gray-400 mb-4">Top 10 por nº de denúncias</p>

            {topZones.length === 0 ? (
              <p className="text-sm text-gray-400 text-center mt-8">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topZones.map(({ zone, count }, i) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={zone} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-navy truncate pr-2">
                            {zone}
                          </span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-orange"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
