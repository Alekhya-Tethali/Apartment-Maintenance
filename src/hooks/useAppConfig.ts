import { useEffect, useState } from "react";

interface AppConfig {
  securityName?: string;
  adminName?: string;
}

export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>({});

  useEffect(() => {
    fetch("/api/config/public")
      .then((r) => r.json())
      .then((d) => {
        setConfig({
          securityName: d.security_name || undefined,
          adminName: d.admin_name || undefined,
        });
      })
      .catch(() => {});
  }, []);

  return config;
}
