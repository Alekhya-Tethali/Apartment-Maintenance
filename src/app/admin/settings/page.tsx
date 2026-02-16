"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

type SettingsTab = "flats" | "app";

interface FlatData {
  id: number;
  flatNumber: string;
  maintenanceAmount: number;
  hasPhone: boolean;
  phone?: string;
}

export default function AdminSettings() {
  const [tab, setTab] = useState<SettingsTab>("flats");
  const [flats, setFlats] = useState<FlatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/flats");
      setFlats(await res.json());
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
        setAdminPassword("");
        setSecurityPin("");
        setTelegramToken("");
        setTelegramAdminChat("");
        setTelegramSecurityChat("");
        setAdminWhatsapp("");
        setWebappUrl("");
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
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
                ${tab === t.key ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
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
                      ? "bg-blue-50 border-blue-500 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-95"}`}
                >
                  <div className="text-xl font-bold text-slate-800">{flat.flatNumber}</div>
                  <div className="text-xs text-slate-500 mt-0.5">₹{flat.maintenanceAmount.toLocaleString("en-IN")}</div>
                  {flat.hasPhone && (
                    <div className="text-[10px] text-green-600 mt-0.5">Phone set</div>
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
          <Card className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">New Admin Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="Leave empty to keep current"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">New Security PIN</label>
              <input
                type="text"
                maxLength={4}
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="4 digits"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Telegram Bot Token</label>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                placeholder="From @BotFather"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Telegram Admin Chat ID</label>
              <input
                type="text"
                value={telegramAdminChat}
                onChange={(e) => setTelegramAdminChat(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Telegram Security Chat ID</label>
              <input
                type="text"
                value={telegramSecurityChat}
                onChange={(e) => setTelegramSecurityChat(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
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
            <Button onClick={handleSaveConfig} loading={saving} variant="primary">
              Save Settings
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
