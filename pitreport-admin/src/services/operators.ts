import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut as firebaseSignOut } from "firebase/auth";
import { db, firebaseConfig } from "../firebase";
import type { AdminRole } from "../types";

export interface OperatorDoc {
  id: string;
  email: string;
  role: AdminRole;
}

// Só operadores — usado pela vista do operador (read-only)
export function subscribeOperators(
  callback: (operators: OperatorDoc[]) => void
): () => void {
  const q = query(collection(db, "admins"), where("role", "==", "operator"));
  return onSnapshot(q,
    (snap) => {
      callback(
        snap.docs.map((d) => ({
          id: d.id,
          email: (d.data().email as string) ?? "",
          role: "operator",
        }))
      );
    },
    () => callback([])
  );
}

// Todos (admins + operadores) — usado pela vista do admin
export function subscribeAllAdmins(
  callback: (entries: OperatorDoc[]) => void
): () => void {
  return onSnapshot(collection(db, "admins"),
    (snap) => {
      callback(
        snap.docs.map((d) => ({
          id: d.id,
          email: (d.data().email as string) ?? "",
          role: ((d.data().role as AdminRole) ?? "admin"),
        }))
      );
    },
    () => callback([])
  );
}

export async function createOperator(email: string, password: string): Promise<void> {
  const secondaryApp = initializeApp(firebaseConfig, `op-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await setDoc(doc(db, "admins", credential.user.uid), { email, role: "operator" });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    if (code.includes("email-already-in-use")) throw new Error("Este email já está em uso.");
    if (code.includes("weak-password")) throw new Error("A password deve ter pelo menos 6 caracteres.");
    if (code.includes("invalid-email")) throw new Error("Email inválido.");
    throw new Error("Erro ao criar operador.");
  } finally {
    await firebaseSignOut(secondaryAuth);
    await deleteApp(secondaryApp);
  }
}

export async function updateAdminRole(uid: string, role: AdminRole): Promise<void> {
  await updateDoc(doc(db, "admins", uid), { role });
}

export async function removeOperator(uid: string): Promise<void> {
  await deleteDoc(doc(db, "admins", uid));
}
