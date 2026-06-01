import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { AdminDoc, AdminRole } from "../types";

export async function getAdminDoc(uid: string): Promise<AdminDoc | null> {
  const snap = await getDoc(doc(db, "admins", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: (data.email as string) ?? "",
    // Documentos sem campo role (anteriores ao sistema de roles) são tratados como admin
    role: ((data.role as AdminRole) ?? "admin"),
  };
}
