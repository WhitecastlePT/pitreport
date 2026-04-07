import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { subscribeAllUsers, deleteUserDoc, unblockUser } from "../services/users";
import { subscribeAllReports } from "../services/reports";
import { useAuth } from "../context/AuthContext";
import type { AppUser, Report } from "../types";

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function UsersPage() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    let usersLoaded = false;
    let reportsLoaded = false;

    const unsub1 = subscribeAllUsers((data) => {
      setUsers(data);
      usersLoaded = true;
      if (reportsLoaded) setLoading(false);
    });

    const unsub2 = subscribeAllReports((data) => {
      setReports(data);
      reportsLoaded = true;
      if (usersLoaded) setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const reportCountByUser = useMemo(() => {
    return reports.reduce<Record<string, number>>((acc, r) => {
      acc[r.userId] = (acc[r.userId] ?? 0) + 1;
      return acc;
    }, {});
  }, [reports]);

  const resolvedCountByUser = useMemo(() => {
    return reports.reduce<Record<string, number>>((acc, r) => {
      if (r.status === "resolved") acc[r.userId] = (acc[r.userId] ?? 0) + 1;
      return acc;
    }, {});
  }, [reports]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function handleUnblock(uid: string) {
    setUnblocking(uid);
    await unblockUser(uid);
    setUnblocking(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteUserDoc(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-navy mb-6">Utilizadores</h1>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
          <input
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
          />
        </div>

        <p className="text-sm text-gray-400 mb-3">
          {filtered.length} {filtered.length === 1 ? "utilizador" : "utilizadores"}
        </p>

        {loading ? (
          <p className="text-gray-400 text-sm">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum utilizador encontrado.</p>
        ) : (
          <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Nome", "Email", "Registo", "Denúncias", "Resolvidas", "Estado", "Ações"].map((h) => (
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
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-navy">
                      {user.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-navy text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                        {reportCountByUser[user.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {resolvedCountByUser[user.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.blocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                          </svg>
                          Bloqueado ({user.loginAttempts} tent.)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.blocked && (
                          <button
                            onClick={() => handleUnblock(user.id)}
                            disabled={unblocking === user.id}
                            className="text-xs font-medium text-orange hover:underline cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            {unblocking === user.id ? "A desbloquear..." : "Desbloquear"}
                          </button>
                        )}
                        {user.id !== adminUser?.uid && (
                          <button
                            onClick={() => setConfirmDelete(user)}
                            className="text-xs font-medium text-red-500 hover:text-red-700 cursor-pointer transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal de confirmação */}
          {confirmDelete && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
                <h2 className="text-lg font-bold text-navy mb-2">Eliminar utilizador</h2>
                <p className="text-sm text-gray-600 mb-1">
                  Tens a certeza que queres eliminar:
                </p>
                <p className="text-sm font-semibold text-navy mb-1">{confirmDelete.name || "—"}</p>
                <p className="text-sm text-gray-500 mb-4">{confirmDelete.email}</p>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-6">
                  Isto remove o utilizador da lista. A conta de autenticação Firebase permanece ativa — para a apagar definitivamente usa o Firebase Console → Authentication.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    disabled={deleting}
                    className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg py-2.5 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-500 text-white text-sm font-medium rounded-lg py-2.5 hover:bg-red-600 transition cursor-pointer disabled:opacity-50"
                  >
                    {deleting ? "A eliminar..." : "Eliminar"}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </Layout>
  );
}
