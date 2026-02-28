"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "@/lib/constants";
import { apiGetSession, apiGetPublicConfig } from "@/lib/api-client";

interface SessionData {
  role: Role;
  flatId?: number;
  flatNumber?: string;
}

interface AppConfig {
  securityName?: string;
  adminName?: string;
}

interface SessionContextValue {
  session: SessionData | null;
  config: AppConfig;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sessionResult, configResult] = await Promise.allSettled([
          apiGetSession(),
          apiGetPublicConfig(),
        ]);

        if (cancelled) return;

        if (sessionResult.status === "fulfilled") {
          setSession(sessionResult.value);
        }

        if (configResult.status === "fulfilled") {
          const data = configResult.value;
          setConfig({
            securityName: data.security_name || undefined,
            adminName: data.admin_name || undefined,
          });
        }
      } catch {
        // Session fetch failed — user is likely not logged in
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, config, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a <SessionProvider>");
  }
  return context;
}
