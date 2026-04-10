import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Layout from "../components/Layout";
import { subscribeAllReports } from "../services/reports";
import type { Report } from "../types";

const STATUS_COLORS: Record<string, string> = {
  pending: "#F5A623",
  in_progress: "#3B82F6",
  resolved: "#22C55E",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em progresso",
  resolved: "Resolvido",
};

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p
        className="text-3xl font-bold"
        style={{ color: color ?? "#151929" }}
      >
        {value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeAllReports((data) => {
      setReports(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const total = reports.length;
    const byStatus = reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    const resolved = byStatus["resolved"] ?? 0;
    const resolutionPct =
      total > 0 ? Math.round((resolved / total) * 100) : 0;

    const byCategory = reports.reduce<Record<string, number>>((acc, r) => {
      const cat = r.category || "Sem categoria";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {});

    const statusChartData = Object.entries(STATUS_LABELS).map(
      ([key, label]) => ({
        name: label,
        value: byStatus[key] ?? 0,
        color: STATUS_COLORS[key],
      })
    );

    const categoryChartData = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return { total, byStatus, resolutionPct, statusChartData, categoryChartData };
  }, [reports]);

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-gray-400">A carregar...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-navy mb-6">Dashboard</h1>

        {/* Cartões de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard label="Total de denúncias" value={stats.total} />
          <StatCard
            label="Pendentes"
            value={stats.byStatus["pending"] ?? 0}
            color={STATUS_COLORS.pending}
          />
          <StatCard
            label="Em progresso"
            value={stats.byStatus["in_progress"] ?? 0}
            color={STATUS_COLORS.in_progress}
          />
          <StatCard
            label="Taxa de resolução"
            value={`${stats.resolutionPct}%`}
            color={STATUS_COLORS.resolved}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por estado */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-navy mb-4">
              Distribuição por estado
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={stats.statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent, value }) =>
                    value > 0 ? `${name} ${Math.round((percent ?? 0) * 100)}%` : ""
                  }
                  labelLine={false}
                  cursor="pointer"
                  onClick={(entry) => {
                    const status = Object.keys(STATUS_LABELS).find(
                      (k) => STATUS_LABELS[k] === entry.name
                    );
                    if (status) navigate(`/reports?status=${status}`);
                  }}
                >
                  {stats.statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Denúncias"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por categoria */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-navy mb-4">
              Distribuição por categoria
            </h2>
            {stats.categoryChartData.length === 0 ? (
              <p className="text-sm text-gray-400 mt-8 text-center">
                Sem dados
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={stats.categoryChartData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, "Denúncias"]} />
                  <Bar
                    dataKey="value"
                    fill="#F5A623"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(entry) => navigate(`/reports?category=${encodeURIComponent(entry.name)}`)}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
