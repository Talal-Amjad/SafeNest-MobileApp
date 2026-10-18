import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isUnauthorized, parentApi, type Me } from "@/api";
import { KEYS, readJSON, remove, writeJSON, type Role } from "@/storage/secure";
import { disablePush, enablePush } from "./push";

// Push is best effort: alerts still arrive by email if it fails.
const tryEnablePush = () => void enablePush().catch((err) => console.warn("push registration failed", err));

type Session =
  | { status: "loading" }
  | { status: "choose-role" }
  | { status: "parent-signed-out" }
  | { status: "parent"; me: Me }
  | { status: "child" };

type SessionApi = Session & {
  chooseRole: (role: Role) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetRole: () => Promise<void>;
};

const Ctx = createContext<SessionApi | null>(null);

/**
 * Which role this phone plays and, for parents, who is signed in. The parent
 * session itself is the API's httpOnly cookie held by the OS; here we only
 * remember the role and ask the API who we are.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const queryClient = useQueryClient();

  const loadParent = useCallback(async () => {
    try {
      setSession({ status: "parent", me: await parentApi.me() });
      tryEnablePush();
    } catch (err) {
      // Offline or signed out: either way the sign-in screen explains.
      setSession({ status: "parent-signed-out" });
      if (!isUnauthorized(err)) console.warn("could not restore session", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const role = await readJSON<Role>(KEYS.role);
      if (role === "parent") await loadParent();
      else if (role === "child") setSession({ status: "child" });
      else setSession({ status: "choose-role" });
    })();
  }, [loadParent]);

  const api = useMemo<SessionApi>(
    () => ({
      ...session,
      chooseRole: async (role) => {
        await writeJSON(KEYS.role, role);
        setSession(role === "parent" ? { status: "parent-signed-out" } : { status: "child" });
      },
      signIn: async (email, password) => {
        const me = await parentApi.login(email.trim(), password);
        setSession({ status: "parent", me });
        tryEnablePush();
      },
      signOut: async () => {
        await disablePush();
        await parentApi.logout().catch(() => undefined);
        queryClient.clear();
        setSession({ status: "parent-signed-out" });
      },
      resetRole: async () => {
        await remove(KEYS.role);
        queryClient.clear();
        setSession({ status: "choose-role" });
      },
    }),
    [session, queryClient],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useSession(): SessionApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
