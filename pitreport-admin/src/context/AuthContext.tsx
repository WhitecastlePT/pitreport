import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";
import { getAdminDoc } from "../services/admin";
import type { AdminRole } from "../types";

interface AuthContextValue {
  user: User | null;
  role: AdminRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const adminDoc = await getAdminDoc(firebaseUser.uid);
        if (adminDoc) {
          setUser(firebaseUser);
          setRole(adminDoc.role);
        } else {
          await firebaseSignOut(auth);
          setUser(null);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (
        code.includes("invalid-credential") ||
        code.includes("wrong-password") ||
        code.includes("user-not-found") ||
        code.includes("invalid-email")
      ) {
        throw new Error("Email ou password incorretos.");
      }
      if (code.includes("too-many-requests")) {
        throw new Error("Demasiadas tentativas. Tente novamente mais tarde.");
      }
      throw new Error("Erro ao iniciar sessão.");
    }
    const adminDoc = await getAdminDoc(credential.user.uid);
    if (!adminDoc) {
      await firebaseSignOut(auth);
      throw new Error("Acesso não autorizado a esta plataforma.");
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
