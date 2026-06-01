import * as XLSX from "xlsx";
import type { Report } from "../types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em progresso",
  resolved: "Resolvida",
};

function addressParts(address: string): string[] {
  if (!address) return [];
  return address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== "portugal");
}

function extractRua(address: string): string {
  return addressParts(address)[0] ?? "";
}

function extractFreguesia(address: string): string {
  const parts = addressParts(address);
  return parts[1] ?? parts[0] ?? "";
}

function extractConcelho(address: string): string {
  const parts = addressParts(address);
  return parts[parts.length - 1] ?? "";
}

function mapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

export function exportReportsToExcel(reports: Report[]): void {
  const wb = XLSX.utils.book_new();

  const rows: unknown[][] = [
    [
      "ID", "Título", "Categoria", "Estado",
      "Morada", "Rua", "Freguesia", "Concelho",
      "Latitude", "Longitude", "Google Maps",
      "Data de submissão",
    ],
    ...reports.map((r) => [
      r.id,
      r.title,
      r.category,
      STATUS_LABELS[r.status] ?? r.status,
      r.address,
      extractRua(r.address),
      extractFreguesia(r.address),
      extractConcelho(r.address),
      r.latitude || "",
      r.longitude || "",
      r.latitude && r.longitude ? mapsUrl(r.latitude, r.longitude) : "",
      r.createdAt.toLocaleDateString("pt-PT"),
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Tornar a coluna Google Maps num hyperlink clicável (coluna K = índice 10)
  reports.forEach((r, i) => {
    if (r.latitude && r.longitude) {
      const cellRef = XLSX.utils.encode_cell({ r: i + 1, c: 10 });
      if (ws[cellRef]) {
        ws[cellRef].l = { Target: mapsUrl(r.latitude, r.longitude) };
      }
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, "Denúncias");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `denuncias_${date}.xlsx`);
}

function extractZone(address: string): string {
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[1] ?? parts[0] ?? "Desconhecida";
}

export function exportAnalyticsToExcel(reports: Report[]): void {
  const wb = XLSX.utils.book_new();
  const total = reports.length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const pending = reports.filter((r) => r.status === "pending").length;
  const inProgress = reports.filter((r) => r.status === "in_progress").length;

  // Folha 1 — Resumo
  const ws1 = XLSX.utils.aoa_to_sheet([
    ["Métrica", "Valor"],
    ["Total de denúncias", total],
    ["Resolvidas", resolved],
    ["Pendentes", pending],
    ["Em progresso", inProgress],
    ["Taxa de resolução", total > 0 ? `${Math.round((resolved / total) * 100)}%` : "0%"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

  // Folha 2 — Por Categoria
  const byCategory: Record<string, { total: number; resolved: number; pending: number; inProgress: number }> = {};
  reports.forEach((r) => {
    const cat = r.category || "Sem categoria";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, resolved: 0, pending: 0, inProgress: 0 };
    byCategory[cat].total++;
    if (r.status === "resolved") byCategory[cat].resolved++;
    if (r.status === "pending") byCategory[cat].pending++;
    if (r.status === "in_progress") byCategory[cat].inProgress++;
  });
  const ws2 = XLSX.utils.aoa_to_sheet([
    ["Categoria", "Total", "Resolvidas", "Pendentes", "Em progresso"],
    ...Object.entries(byCategory)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, s]) => [cat, s.total, s.resolved, s.pending, s.inProgress]),
  ]);
  XLSX.utils.book_append_sheet(wb, ws2, "Por Categoria");

  // Folha 3 — Por Zona
  const byZone: Record<string, number> = {};
  reports.forEach((r) => {
    if (!r.address) return;
    const zone = extractZone(r.address);
    byZone[zone] = (byZone[zone] ?? 0) + 1;
  });
  const ws3 = XLSX.utils.aoa_to_sheet([
    ["Zona", "Total de denúncias"],
    ...Object.entries(byZone)
      .sort((a, b) => b[1] - a[1])
      .map(([zone, count]) => [zone, count]),
  ]);
  XLSX.utils.book_append_sheet(wb, ws3, "Por Zona");

  // Folha 4 — Lista Completa
  const ws4 = XLSX.utils.aoa_to_sheet([
    ["ID", "Título", "Categoria", "Estado", "Morada", "Data de submissão"],
    ...reports.map((r) => [
      r.id,
      r.title,
      r.category,
      STATUS_LABELS[r.status] ?? r.status,
      r.address,
      r.createdAt.toLocaleDateString("pt-PT"),
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, ws4, "Lista Completa");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `relatorio_pitreport_${date}.xlsx`);
}
