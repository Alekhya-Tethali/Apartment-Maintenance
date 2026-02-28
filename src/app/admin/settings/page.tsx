"use client";

import { useState, useCallback, useEffect } from "react";
import NavBar from "@/components/NavBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { apiGetFlats, apiGetConfig } from "@/lib/api-client";
import type { FlatData } from "@/lib/types";
import FlatSettingsTab from "./_components/FlatSettingsTab";
import AppSettingsTab from "./_components/AppSettingsTab";

type SettingsTab = "flats" | "app";

export default function AdminSettings() {
  const [tab, setTab] = useState<SettingsTab>("flats");
  const [flats, setFlats] = useState<FlatData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, clearToast } = useToast();

  // Config state for AppSettingsTab
  const [appConfig, setAppConfig] = useState({ securityName: "", adminName: "", adminWhatsapp: "", webappUrl: "", backupEmail: "" });
  const [configStatus, setConfigStatus] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const [flatsData, configData] = await Promise.all([apiGetFlats(), apiGetConfig()]);
      setFlats(flatsData);

      setAppConfig({
        securityName: configData.security_name || "",
        adminName: configData.admin_name || "",
        adminWhatsapp: configData.admin_whatsapp_number || "",
        webappUrl: configData.webapp_url || "",
        backupEmail: configData.backup_email_address || "",
      });

      setConfigStatus({
        telegram_bot_token: configData.telegram_bot_token === "(set)",
        telegram_admin_chat_id: configData.telegram_admin_chat_id === "(set)",
        telegram_security_chat_id: configData.telegram_security_chat_id === "(set)",
        admin_password_hash: configData.admin_password_hash === "(set)",
        security_pin_hash: configData.security_pin_hash === "(set)",
        backup_email_password: configData.backup_email_password === "(set)",
      });
    } catch {
      showToast("Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      <NavBar title="Settings" backHref="/admin/months" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Sub-tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          {([{ key: "flats", label: "Flats" }, { key: "app", label: "App Settings" }] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                ${tab === t.key ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "flats" && (
          <FlatSettingsTab flats={flats} onSaved={loadData} showToast={showToast} />
        )}

        {tab === "app" && (
          <AppSettingsTab initialConfig={appConfig} configStatus={configStatus} onSaved={loadData} showToast={showToast} />
        )}
      </main>
    </div>
  );
}
