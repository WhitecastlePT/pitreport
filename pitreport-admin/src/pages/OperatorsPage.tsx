import { type FormEvent, useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  createOperator,
  removeOperator,
  subscribeAllAdmins,
  subscribeOperators,
  updateAdminRole,
  type OperatorDoc,
} from "../services/operators";
import type { AdminRole } from "../types";

const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Admin",
  operator: "Operador",
};

const ROLE_STYLES: Record<AdminRole, string> = {
  admin: "bg-navy/10 text-navy",
  operator: "bg-orange/10 text-orange",
};

export default function OperatorsPage() {
  const { user, role: currentRole } = useAuth();
  const isAdmin = currentRole === "admin";

  const [entries, setEntries] = useState<OperatorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  useEffect(() => {
    // Admin: todos os documentos de admins; Operador: só operadores (query filtrada por role)
    const unsub = isAdmin
      ? subscribeAllAdmins((data) => { setEntries(data); setLoading(false); })
      : subscribeOperators((data) => { setEntries(data); setLoading(false); });
    return unsub;
  }, [isAdmin]);

  function openModal() {
    setEmail("");
    setPassword("");
    setCreateError("");
    setShowModal(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await createOperator(email, password);
      setShowModal(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar operador.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(uid: string, newRole: AdminRole) {
    setUpdatingRoleId(uid);
    try {
      await updateAdminRole(uid, newRole);
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleRemove(uid: string, entryEmail: string) {
    if (!confirm(`Remover "${entryEmail}"? O acesso será revogado imediatamente.`)) return;
    setRemovingId(uid);
    try {
      await removeOperator(uid);
    } finally {
      setRemovingId(null);
    }
  }

  const isSelf = (uid: string) => uid === user?.uid;

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              {isAdmin ? "Utilizadores da plataforma" : "Operadores"}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {isAdmin
                ? "Gerir admins e operadores com acesso à plataforma"
                : "Contas com acesso limitado à plataforma de gestão"}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openModal}
              className="flex items-center gap-2 bg-orange text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Novo operador
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-400 p-6">A carregar...</p>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
              <p className="text-sm">Nenhum utilizador encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Role
                  </th>
                  {isAdmin && <th className="px-6 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${isSelf(entry.id) ? "bg-orange/5" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-6 py-4 text-navy font-medium">
                      {entry.email}
                      {isSelf(entry.id) && (
                        <span className="ml-2 text-xs text-gray-400 font-normal">(você)</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && !isSelf(entry.id) ? (
                        <select
                          value={entry.role}
                          disabled={updatingRoleId === entry.id}
                          onChange={(e) => handleRoleChange(entry.id, e.target.value as AdminRole)}
                          className="text-xs font-medium border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-orange disabled:opacity-50 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operador</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_STYLES[entry.role]}`}>
                          {ROLE_LABELS[entry.role]}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        {!isSelf(entry.id) && (
                          <button
                            onClick={() => handleRemove(entry.id, entry.email)}
                            disabled={removingId === entry.id}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {removingId === entry.id ? "A remover..." : "Remover"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal — Criar operador */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !creating && setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <h2 className="text-lg font-bold text-navy mb-1">Novo operador</h2>
            <p className="text-sm text-gray-400 mb-6">
              Cria uma conta com acesso limitado. Partilha as credenciais com o operador.
            </p>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
                  placeholder="operador@exemplo.com"
                  disabled={creating}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Password temporária</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
                  placeholder="Mínimo 6 caracteres"
                  disabled={creating}
                />
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                  {createError}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                  className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-orange text-white text-sm font-semibold rounded-lg py-2.5 hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "A criar..." : "Criar operador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
