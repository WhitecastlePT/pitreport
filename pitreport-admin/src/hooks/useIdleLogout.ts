import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

/**
 * Termina a sessão automaticamente após `timeoutSeconds` de inatividade.
 * Qualquer interação (rato, teclado, scroll, toque) reinicia a contagem.
 * Devolve os segundos que faltam para o fim da sessão, para mostrar no ecrã.
 */
export function useIdleLogout(timeoutSeconds = 30): number {
  const { signOut } = useAuth();
  const deadlineRef = useRef(Date.now() + timeoutSeconds * 1000);
  const expiredRef = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);

  const reset = useCallback(() => {
    if (expiredRef.current) return;
    deadlineRef.current = Date.now() + timeoutSeconds * 1000;
  }, [timeoutSeconds]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, reset, { passive: true }),
    );

    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        void signOut();
      }
    }, 250);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [reset, signOut]);

  return secondsLeft;
}
