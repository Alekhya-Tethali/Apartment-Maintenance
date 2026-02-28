"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiUpdateConfig } from "@/lib/api-client";

interface AppSettingsTabProps {
  initialConfig: {
    securityName: string;
    adminName: string;
    adminWhatsapp: string;
    webappUrl: string;
    backupEmail: string;
  };
  configStatus: Record<string, boolean>;
  onSaved: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function AppSettingsTab({
  initialConfig,
  configStatus,
  onSaved,
  showToast,
}: AppSettingsTabProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [securityPin, setSecurityPin] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramAdminChat, setTelegramAdminChat] = useState("");
  const [telegramSecurityChat, setTelegramSecurityChat] = useState("");
  const [adminWhatsapp, setAdminWhatsapp] = useState(initialConfig.adminWhatsapp);
  const [webappUrl, setWebappUrl] = useState(initialConfig.webappUrl);
  const [securityName, setSecurityName] = useState(initialConfig.securityName);
  const [adminName, setAdminName] = useState(initialConfig.adminName);
  const [backupEmail, setBackupEmail] = useState(initialConfig.backupEmail);
  const [backupEmailPassword, setBackupEmailPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync when parent refetches config
  useEffect(() => {
    setAdminWhatsapp(initialConfig.adminWhatsapp);
    setWebappUrl(initialConfig.webappUrl);
    setSecurityName(initialConfig.securityName);
    setAdminName(initialConfig.adminName);
    setBackupEmail(initialConfig.backupEmail);
  }, [initialConfig]);

  const handleSave = async () => {
    setSaving(true);
    const updates: Record<string, string> = {};
    if (adminPassword) updates.adminPassword = adminPassword;
    if (securityPin) updates.securityPin = securityPin;
    if (telegramToken) updates.telegramBotToken = telegramToken;
    if (telegramAdminChat) updates.telegramAdminChatId = telegramAdminChat;
    if (telegramSecurityChat) updates.telegramSecurityChatId = telegramSecurityChat;
    if (adminWhatsapp) updates.adminWhatsappNumber = adminWhatsapp;
    if (webappUrl) updates.webappUrl = webappUrl;
    if (securityName) updates.securityName = securityName;
    if (adminName) updates.adminName = adminName;
    if (backupEmail) updates.backupEmail = backupEmail;
    if (backupEmailPassword) updates.backupEmailPassword = backupEmailPassword;

    if (Object.keys(updates).length === 0) {
      showToast("Nothing to save", "error");
      setSaving(false);
      return;
    }

    try {
      await apiUpdateConfig(updates);
      showToast("Settings saved!", "success");
      setAdminPassword("");
      setSecurityPin("");
      setTelegramToken("");
      setTelegramAdminChat("");
      setTelegramSecurityChat("");
      setBackupEmailPassword("");
      onSaved();
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const statusIndicator = (key: string) =>
    configStatus[key] !== undefined ? (
      <span className={`ml-2 text-[10px] font-medium ${configStatus[key] ? "text-emerald-600" : "text-amber-600"}`}>
        {configStatus[key] ? "(configured)" : "(not configured)"}
      </span>
    ) : null;

  return (
    <div className="space-y-4">
      {/* Admin Section */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Admin</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Admin Display Name</label>
            <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Bangar Reddy" />
            <p className="text-xs text-slate-400 mt-1">Shown in status labels (e.g. &quot;Bangar Reddy Reviewing&quot;)</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">Admin Password{statusIndicator("admin_password_hash")}</label>
            <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Leave empty to keep current" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Admin WhatsApp Number</label>
            <input type="tel" value={adminWhatsapp} onChange={(e) => setAdminWhatsapp(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="919876543210" />
          </div>
        </div>
      </Card>

      {/* Security Section */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Security</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Security Person Name</label>
            <input type="text" value={securityName} onChange={(e) => setSecurityName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Ramesh" />
            <p className="text-xs text-slate-400 mt-1">Shown in payment status (e.g. &quot;Ramesh&apos;s Confirmation Pending&quot;)</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">Security PIN{statusIndicator("security_pin_hash")}</label>
            <input type="text" maxLength={4} value={securityPin} onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ""))} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="4 digits" />
          </div>
        </div>
      </Card>

      {/* Telegram Section */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Telegram Notifications</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Bot Token{statusIndicator("telegram_bot_token")}</label>
            <input type="text" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="From @BotFather" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Admin Chat ID{statusIndicator("telegram_admin_chat_id")}</label>
            <input type="text" value={telegramAdminChat} onChange={(e) => setTelegramAdminChat(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Security Chat ID{statusIndicator("telegram_security_chat_id")}</label>
            <input type="text" value={telegramSecurityChat} onChange={(e) => setTelegramSecurityChat(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </Card>

      {/* App Section */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">App</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Webapp URL</label>
            <input type="url" value={webappUrl} onChange={(e) => setWebappUrl(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="https://your-app.vercel.app" />
            <p className="text-xs text-slate-400 mt-1">Included in reminder messages to residents</p>
          </div>
        </div>
      </Card>

      {/* Backup Section */}
      <Card>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Weekly Backup</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Backup Email Address</label>
            <input type="email" value={backupEmail} onChange={(e) => setBackupEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. laurel.residency@gmail.com" />
            <p className="text-xs text-slate-400 mt-1">Database backup will be sent to this email every Sunday</p>
          </div>
          <div>
            <label className="text-xs text-slate-500">Gmail App Password{statusIndicator("backup_email_password")}</label>
            <input type="password" value={backupEmailPassword} onChange={(e) => setBackupEmailPassword(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Leave empty to keep current" />
            <p className="text-xs text-slate-400 mt-1">Google Account → Security → App Passwords</p>
          </div>
        </div>
      </Card>

      <Button onClick={handleSave} loading={saving} variant="primary">
        Save All Settings
      </Button>
    </div>
  );
}
