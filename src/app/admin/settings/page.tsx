"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import type { FlatData, ToastState } from "@/lib/types";

type SettingsTab = "flats" | "app";

export default function AdminSettings() {
  const [tab, setTab] = useState<SettingsTab>("flats");
  const [flats, setFlats] = useState<FlatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Flat editing
  const [editingFlat, setEditingFlat] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Config editing
  const [adminPassword, setAdminPassword] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramAdminChat, setTelegramAdminChat] = useState("");
  const [telegramSecurityChat, setTelegramSecurityChat] = useState("");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [webappUrl, setWebappUrl] = useState("");
  const [securityName, setSecurityName] = useState("");
  const [adminName, setAdminName] = useState("");

  // Track which sensitive keys are configured (from API response)
  const [configStatus, setConfigStatus] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      const [flatsRes, configRes] = await Promise.all([
        fetch("/api/flats"),
        fetch("/api/config"),
      ]);

      setFlats(await flatsRes.json());

      if (configRes.ok) {
        const configData = await configRes.json();

        // Populate safe (visible) fields
        setSecurityName(configData.security_name || "");
        setAdminName(configData.admin_name || "");
        setAdminWhatsapp(configData.admin_whatsapp_number || "");
        setWebappUrl(configData.webapp_url || "");

        // Track configured status for sensitive fields
        setConfigStatus({
          telegram_bot_token: configData.telegram_bot_token === "(set)",
          telegram_admin_chat_id: configData.telegram_admin_chat_id === "(set)",
          telegram_security_chat_id: configData.telegram_security_chat_id === "(set)",
          admin_password_hash: configData.admin_password_hash === "(set)",
          security_pin_hash: configData.security_pin_hash === "(set)",
        });
      }
    } catch {
      setToast({ message: "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const startEditing = (flat: FlatData) => {
    setEditingFlat(flat.id);
    setEditAmount(flat.maintenanceAmount.toString());
    setEditPin("");
    setEditPhone(flat.phone || "");
  };

  const handleSaveFlat = async () => {
    if (!editingFlat) return;
    setSaving(true);

    const updates: Record<string, unknown> = { flatId: editingFlat };
    if (editAmount) updates.maintenanceAmount = parseFloat(editAmount);
    if (editPin) updates.pin = editPin;
    if (editPhone) updates.phone = editPhone;

    try {
      const res = await fetch("/api/flats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setToast({ message: "Flat updated!", type: "success" });
        setEditingFlat(null);
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (adminPassword) updates.adminPassword = adminPassword;
    if (securityPin) updates.securityPin = securityPin;
    if (telegramToken) updates.telegramBotToken = telegramToken;
    if (telegramAdminChat) updates.telegramAdminChatId = telegramAdminChat;
    if (telegramSecurityChat) updates.telegramSecurityChatId = telegramSecurityChat;
    if (adminWhatsapp) updates.adminWhatsappNumber = adminWhatsapp;
    if (webappUrl) updates.webappUrl = webappUrl;
    if (securityName) updates.securityName = securityName;
    if (adminName) updates.adminName = adminName;

    if (Object.keys(updates).length === 0) {
      setToast({ message: "Nothing to save", type: "error" });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setToast({ message: "Settings saved!", type: "success" });
        // Only clear sensitive fields; safe fields stay populated
        setAdminPassword("");
        setSecurityPin("");
        setTelegramToken("");
        setTelegramAdminChat("");
        setTelegramSecurityChat("");
        // Re-fetch config to update displayed values and config status
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <NavBar title="Settings" backHref="/admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Sub-tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          {([
            { key: "flats", label: "Flats" },
            { key: "app", label: "App Settings" },
          ] as const).map((t) => (
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

        {/* Flats Tab */}
        {tab === "flats" && (
          <div className="space-y-3">
            {/* Compact grid of flats */}
            <div className="grid grid-cols-3 gap-2">
              {flats.map((flat) => (
                <button
                  key={flat.id}
                  onClick={() => {
                    if (editingFlat === flat.id) {
                      setEditingFlat(null);
                    } else {
                      startEditing(flat);
                    }
                  }}
                  className={`rounded-xl p-3 text-center transition-all border-2
                    ${editingFlat === flat.id
                      ? "bg-indigo-50 border-indigo-500 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-95"}`}
                >
                  <div className="text-xl font-bold text-slate-800">{flat.flatNumber}</div>
                  <div className="text-xs text-slate-500 mt-0.5">₹{flat.maintenanceAmount.toLocaleString("en-IN")}</div>
                  {flat.hasPhone && (
                    <div className="text-[10px] text-emerald-600 mt-0.5">Phone set</div>
                  )}
                </button>
              ))}
            </div>

            {/* Edit panel - appears below grid when a flat is selected */}
            {editingFlat && (() => {
              const flat = flats.find((f) => f.id === editingFlat);
              if (!flat) return null;
              return (
                <Card>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-lg text-slate-800">Flat {flat.flatNumber}</div>
                      <button
                        onClick={() => setEditingFlat(null)}
                        className="p-1 hover:bg-slate-100 rounded-lg"
                      >
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Amount (₹)</label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">New PIN (4 digits, leave empty to keep)</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editPin}
                        onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="••••"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Phone (with country code)</label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                        placeholder="919876543210"
                      />
                    </div>
                    <Button variant="success" size="sm" loading={saving} onClick={handleSaveFlat}>
                      Save Changes
                    </Button>
                  </div>
                </Card>
              );
            })()}
          </div>
        )}

        {/* App Settings Tab */}
        {tab === "app" && (
          <div className="space-y-4">
            {/* Admin Section */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Admin</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Admin Display Name</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g. Bangar Reddy"
                  />
                  <p className="text-xs text-slate-400 mt-1">Shown in status labels (e.g. &quot;Bangar Reddy Reviewing&quot;)</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    Admin Password
                    {configStatus.admin_password_hash !== undefined && (
                      <span className={`ml-2 text-[10px] font-medium ${configStatus.admin_password_hash ? "text-emerald-600" : "text-amber-600"}`}>
                        {configStatus.admin_password_hash ? "(configured)" : "(not configured)"}
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="Leave empty to keep current"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Admin WhatsApp Number</label>
                  <input
                    type="tel"
                    value={adminWhatsapp}
                    onChange={(e) => setAdminWhatsapp(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="919876543210"
                  />
                </div>
              </div>
            </Card>

            {/* Security Section */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Security</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Security Person Name</label>
                  <input
                    type="text"
                    value={securityName}
                    onChange={(e) => setSecurityName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g. Ramesh"
                  />
                  <p className="text-xs text-slate-400 mt-1">Shown in payment status (e.g. &quot;Ramesh&apos;s Confirmation Pending&quot;)</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    Security PIN
                    {configStatus.security_pin_hash !== undefined && (
                      <span className={`ml-2 text-[10px] font-medium ${configStatus.security_pin_hash ? "text-emerald-600" : "text-amber-600"}`}>
                        {configStatus.security_pin_hash ? "(configured)" : "(not configured)"}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={securityPin}
                    onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="4 digits"
                  />
                </div>
              </div>
            </Card>

            {/* Telegram Section */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Telegram Notifications</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">
                    Bot Token
                    {configStatus.telegram_bot_token !== undefined && (
                      <span className={`ml-2 text-[10px] font-medium ${configStatus.telegram_bot_token ? "text-emerald-600" : "text-amber-600"}`}>
                        {configStatus.telegram_bot_token ? "(configured)" : "(not configured)"}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="From @BotFather"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    Admin Chat ID
                    {configStatus.telegram_admin_chat_id !== undefined && (
                      <span className={`ml-2 text-[10px] font-medium ${configStatus.telegram_admin_chat_id ? "text-emerald-600" : "text-amber-600"}`}>
                        {configStatus.telegram_admin_chat_id ? "(configured)" : "(not configured)"}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={telegramAdminChat}
                    onChange={(e) => setTelegramAdminChat(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">
                    Security Chat ID
                    {configStatus.telegram_security_chat_id !== undefined && (
                      <span className={`ml-2 text-[10px] font-medium ${configStatus.telegram_security_chat_id ? "text-emerald-600" : "text-amber-600"}`}>
                        {configStatus.telegram_security_chat_id ? "(configured)" : "(not configured)"}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={telegramSecurityChat}
                    onChange={(e) => setTelegramSecurityChat(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </Card>

            {/* App Section */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">App</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Webapp URL</label>
                  <input
                    type="url"
                    value={webappUrl}
                    onChange={(e) => setWebappUrl(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    placeholder="https://your-app.vercel.app"
                  />
                  <p className="text-xs text-slate-400 mt-1">Included in reminder messages to residents</p>
                </div>
              </div>
            </Card>

            <Button onClick={handleSaveConfig} loading={saving} variant="primary">
              Save All Settings
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
