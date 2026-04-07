import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { AttributionControl, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { updateReportStatus } from "../services/reports";
import { subscribeMessages, sendMessage } from "../services/messages";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { Report, ReportStatus, Message } from "../types";

// Corrigir ícone padrão do Leaflet com Vite
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "Pendente",
  in_progress: "Em progresso",
  resolved: "Resolvido",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<ReportStatus>("pending");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "reports", id)).then((snap) => {
      if (!snap.exists()) {
        setNotFound(true);
      } else {
        const data = snap.data();
        const r: Report = {
          id: snap.id,
          title: data.title ?? "",
          description: data.description ?? "",
          category: data.category ?? "",
          imageUrls: Array.isArray(data.imageUrls)
            ? data.imageUrls
            : data.imageUrl ? [data.imageUrl] : [],
          photoMetadata: Array.isArray(data.photoMetadata) ? data.photoMetadata : [],
          latitude: Number(data.latitude ?? 0),
          longitude: Number(data.longitude ?? 0),
          address: data.address ?? "",
          heading: data.heading != null ? Number(data.heading) : null,
          headingLabel: data.headingLabel ?? "",
          status: data.status ?? "pending",
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          userId: data.userId ?? "",
          decibelLevel: data.decibelLevel != null ? Number(data.decibelLevel) : null,
        };
        setReport(r);
        setStatus(r.status);
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    return subscribeMessages(id, setMessages);
  }, [id]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !id || !user) return;
    setSending(true);
    await sendMessage(id, newMessage, user.uid, user.email ?? "Admin");
    setNewMessage("");
    setSending(false);
  }

  function openImage(url: string) {
    setSelectedImage(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function closeImage() {
    setSelectedImage(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function navigateImage(dir: 1 | -1) {
    if (!report || !selectedImage) return;
    const idx = report.imageUrls.indexOf(selectedImage);
    const next = (idx + dir + report.imageUrls.length) % report.imageUrls.length;
    openImage(report.imageUrls[next]);
  }

  useEffect(() => {
    if (!selectedImage) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeImage();
      if (e.key === "ArrowRight") navigateImage(1);
      if (e.key === "ArrowLeft") navigateImage(-1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.5, 5));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage, report]);

  async function handleSave() {
    if (!report) return;
    setSaving(true);
    await updateReportStatus(report.id, status);
    setReport((prev) => prev ? { ...prev, status } : prev);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <Layout><p className="p-8 text-gray-400">A carregar...</p></Layout>;
  }
  if (notFound || !report) {
    return <Layout><p className="p-8 text-gray-400">Denúncia não encontrada.</p></Layout>;
  }

  const hasCoords = report.latitude !== 0 || report.longitude !== 0;

  return (
    <Layout>
      {/* Lightbox */}
      {selectedImage && report && (() => {
        const idx = report.imageUrls.indexOf(selectedImage);
        const total = report.imageUrls.length;
        return (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) closeImage(); }}
          >
            {/* Botão fechar */}
            <button
              onClick={closeImage}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition cursor-pointer"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Contador */}
            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-sm select-none">
              {idx + 1} / {total}
            </span>

            {/* Controles de zoom */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 rounded-full px-4 py-2">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
                disabled={zoom <= 1}
                className="text-white/70 hover:text-white disabled:opacity-30 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM8 11h6" />
                </svg>
              </button>
              <span className="text-white/60 text-xs w-10 text-center select-none">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.5, 5))}
                disabled={zoom >= 5}
                className="text-white/70 hover:text-white disabled:opacity-30 transition cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16zM11 8v6M8 11h6" />
                </svg>
              </button>
              {zoom > 1 && (
                <button
                  onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                  className="text-white/60 hover:text-white text-xs transition cursor-pointer ml-1"
                >
                  Repor
                </button>
              )}
            </div>

            {/* Seta anterior */}
            {total > 1 && (
              <button
                onClick={() => navigateImage(-1)}
                className="absolute left-4 text-white/70 hover:text-white transition cursor-pointer"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Imagem com zoom e pan */}
            <div
              className="overflow-hidden max-h-[85vh] max-w-[85vw]"
              style={{ cursor: zoom > 1 ? (dragging ? "grabbing" : "grab") : "default" }}
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) => Math.min(Math.max(z - e.deltaY * 0.001, 1), 5));
                if (zoom <= 1) setPan({ x: 0, y: 0 });
              }}
              onMouseDown={(e) => {
                if (zoom <= 1) return;
                setDragging(true);
                setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
              }}
              onMouseMove={(e) => {
                if (!dragging) return;
                setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
            >
              <img
                src={selectedImage}
                alt="Foto ampliada"
                draggable={false}
                className="rounded-lg shadow-2xl max-h-[85vh] max-w-[85vw] select-none"
                style={{
                  transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transition: dragging ? "none" : "transform 0.15s ease",
                }}
              />
            </div>

            {/* Seta seguinte */}
            {total > 1 && (
              <button
                onClick={() => navigateImage(1)}
                className="absolute right-4 text-white/70 hover:text-white transition cursor-pointer"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        );
      })()}

      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-6">
          <button
            onClick={() => navigate("/reports")}
            className="text-sm text-gray-400 hover:text-navy transition-colors cursor-pointer flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-navy truncate">{report.title || "Sem título"}</h1>
          <StatusBadge status={report.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Informações */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Informações</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <dt className="text-gray-400 mb-0.5">Categoria</dt>
                  <dd className="font-medium text-navy">{report.category || "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 mb-0.5">Data</dt>
                  <dd className="font-medium text-navy">{formatDate(report.createdAt)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-400 mb-0.5">Morada</dt>
                  <dd className="font-medium text-navy">{report.address || "—"}</dd>
                </div>
                {report.headingLabel && (
                  <div>
                    <dt className="text-gray-400 mb-0.5">Direção</dt>
                    <dd className="font-medium text-navy">{report.headingLabel}</dd>
                  </div>
                )}
                {report.decibelLevel != null && (
                  <div>
                    <dt className="text-gray-400 mb-0.5">Nível de ruído</dt>
                    <dd className="font-medium text-navy flex items-center gap-2">
                      <span
                        className="text-lg font-bold"
                        style={{
                          color:
                            report.decibelLevel < 50 ? "#22C55E"
                            : report.decibelLevel < 70 ? "#EAB308"
                            : report.decibelLevel < 85 ? "#F5A623"
                            : "#EF4444",
                        }}
                      >
                        {report.decibelLevel.toFixed(1)} dB
                      </span>
                      <span className="text-xs text-gray-400">
                        {report.decibelLevel < 50 ? "Baixo"
                          : report.decibelLevel < 70 ? "Moderado"
                          : report.decibelLevel < 85 ? "Elevado"
                          : "Muito elevado"}
                      </span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-400 mb-0.5">Utilizador (UID)</dt>
                  <dd className="font-medium text-navy text-xs truncate">{report.userId || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-400 mb-0.5">Descrição</dt>
                  <dd className="font-medium text-navy whitespace-pre-wrap">{report.description || "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Galeria */}
            {report.imageUrls.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Fotos ({report.imageUrls.length})
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {report.imageUrls.map((url, i) => {
                    const meta = report.photoMetadata[i];
                    return (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt={`Foto ${i + 1}`}
                          onClick={() => openImage(url)}
                          className="w-full h-32 object-cover rounded-lg cursor-pointer group-hover:brightness-90 transition"
                        />
                        {meta?.headingLabel && (
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            {meta.headingLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mapa */}
            {hasCoords && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Localização</h2>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-orange px-3 py-1.5 rounded-lg hover:opacity-90 transition"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Ir até local
                  </a>
                </div>
                <MapContainer
                  center={[report.latitude, report.longitude]}
                  zoom={16}
                  className="w-full h-72 rounded-lg z-0"
                  attributionControl={false}
                >
                  <AttributionControl prefix="Leaflet" />
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {/* Marcador principal */}
                  <Marker position={[report.latitude, report.longitude]}>
                    <Popup>{report.title || "Denúncia"}<br />{report.address}</Popup>
                  </Marker>
                  {/* Marcadores por foto */}
                  {report.photoMetadata
                    .filter((m) => m.latitude && m.longitude)
                    .map((m, i) => (
                      <Marker key={i} position={[m.latitude, m.longitude]}>
                        <Popup>
                          Foto {i + 1} — {m.headingLabel || ""}
                          {m.url && (
                            <><br /><img src={m.url} alt="" className="w-24 mt-1 rounded" /></>
                          )}
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>
            )}
          </div>

          {/* Coluna lateral */}
          <div className="flex flex-col gap-4">
            {/* Alterar estado */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Alterar estado</h2>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as ReportStatus); setSaved(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button
                onClick={handleSave}
                disabled={saving || status === report.status}
                className="w-full bg-orange text-white text-sm font-semibold rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
              >
                {saving ? "A guardar..." : saved ? "Guardado ✓" : "Guardar"}
              </button>
            </div>

            {/* Mensagens */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Feedback ({messages.length})
              </h2>

              {/* Histórico */}
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem mensagens ainda.</p>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-navy truncate">
                          {msg.authorName}
                        </span>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                          {msg.createdAt.toLocaleDateString("pt-PT", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Campo de nova mensagem */}
              <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                <textarea
                  rows={3}
                  placeholder="Escrever feedback..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="w-full bg-navy text-white text-sm font-semibold rounded-lg py-2 hover:opacity-90 transition disabled:opacity-40 cursor-pointer"
                >
                  {sending ? "A enviar..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
