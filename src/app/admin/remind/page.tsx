"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { MONTH_NAMES } from "@/lib/constants";
import type { FlatData, MonthData, PaymentData, ReminderData } from "@/lib/types";

function formatReminderMessage(
  flatNumber: string,
  amount: number,
  monthLabel: string,
  webappUrl: string | null
): string {
  let msg = `Hi, this is a reminder that Flat ${flatNumber}'s maintenance of \u20B9${amount.toLocaleString("en-IN")} for ${monthLabel} is overdue. Please pay at the earliest.`;
  if (webappUrl) {
    msg += `\n\nPlease update your payment at: ${webappUrl}`;
  }
  msg += "\n\nThank you.";
  return msg;
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function RemindDefaulters() {
  const [defaulters, setDefaulters] = useState<
    { flat: FlatData; message: string; whatsappLink: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<MonthData | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [trackingIds, setTrackingIds] = useState<Set<number>>(new Set());

  const loadReminders = useCallback(async (monthId: number) => {
    try {
      const res = await fetch(`/api/reminders?monthId=${monthId}`);
      if (res.ok) {
        const data: ReminderData[] = await res.json();
        setReminders(data);
      }
    } catch {
      // Silently fail -- reminders are supplementary info
    }
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    try {
      const [flatsRes, monthsRes, paymentsRes, configRes] = await Promise.all([
        fetch("/api/flats"),
        fetch("/api/months"),
        fetch("/api/payments"),
        fetch("/api/config"),
      ]);

      const flatsData: FlatData[] = await flatsRes.json();
      const monthsData: MonthData[] = await monthsRes.json();
      const paymentsData: PaymentData[] = await paymentsRes.json();

      let webappUrl: string | null = null;
      if (configRes.ok) {
        const configData: Record<string, string> = await configRes.json();
        webappUrl = configData.webapp_url || null;
      }

      const openMonth = monthsData.find((m) => m.status === "open");
      setCurrentMonth(openMonth || null);

      if (openMonth) {
        const monthLabel = `${MONTH_NAMES[openMonth.month - 1]} ${openMonth.year}`;
        const paidFlatIds = paymentsData
          .filter(
            (p) =>
              p.monthId === openMonth.id && p.status !== "rejected"
          )
          .map((p) => p.flatId);

        const defaulterFlats = flatsData.filter(
          (f) => !paidFlatIds.includes(f.id)
        );

        setDefaulters(
          defaulterFlats.map((flat) => {
            const message = formatReminderMessage(
              flat.flatNumber,
              flat.maintenanceAmount,
              monthLabel,
              webappUrl
            );
            return {
              flat,
              message,
              whatsappLink: flat.phone
                ? generateWhatsAppLink(flat.phone, message)
                : null,
            };
          })
        );

        // Load reminder history for this month
        await loadReminders(openMonth.id);
      }
    } catch {
      setToast({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function trackReminder(flatId: number) {
    if (!currentMonth) return;

    setTrackingIds((prev) => new Set(prev).add(flatId));

    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatId, monthId: currentMonth.id }),
      });

      if (res.ok) {
        // Refresh reminders list to show the new entry
        await loadReminders(currentMonth.id);
      }
    } catch {
      // Silently fail -- the primary action (copy / whatsapp) already succeeded
    } finally {
      setTrackingIds((prev) => {
        const next = new Set(prev);
        next.delete(flatId);
        return next;
      });
    }
  }

  const copyMessage = (message: string, flatId: number) => {
    navigator.clipboard.writeText(message);
    setToast({ message: "Message copied!", type: "info" });
    trackReminder(flatId);
  };

  const handleWhatsApp = (flatId: number) => {
    trackReminder(flatId);
  };

  function getLatestReminder(flatId: number): ReminderData | null {
    // reminders are ordered by sentAt desc from the API
    return reminders.find((r) => r.flatId === flatId) || null;
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <NavBar title="Remind Defaulters" backHref="/admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {currentMonth && (
          <Card className="bg-rose-50 border-rose-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-rose-700">
                {defaulters.length}
              </div>
              <div className="text-sm text-rose-600">
                Unpaid flats for {MONTH_NAMES[currentMonth.month - 1]}{" "}
                {currentMonth.year}
              </div>
            </div>
          </Card>
        )}

        {defaulters.length === 0 ? (
          <Card>
            <p className="text-emerald-600 text-center py-4 font-medium">
              All flats have paid! No reminders needed.
            </p>
          </Card>
        ) : (
          defaulters.map(({ flat, message, whatsappLink }) => {
            const lastReminder = getLatestReminder(flat.id);
            const isTracking = trackingIds.has(flat.id);

            return (
              <Card key={flat.id}>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-lg text-slate-800">
                      Flat {flat.flatNumber}
                    </div>
                    <div className="text-lg font-semibold text-rose-600">
                      ₹{flat.maintenanceAmount.toLocaleString("en-IN")}
                    </div>
                  </div>

                  {lastReminder && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Last reminded: {formatRelativeDate(lastReminder.sentAt)}{" "}
                      by {lastReminder.sentBy}
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 whitespace-pre-line">
                    {message}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTracking}
                      onClick={() => copyMessage(message, flat.id)}
                    >
                      Copy Message
                    </Button>
                    {whatsappLink && (
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                        onClick={() => handleWhatsApp(flat.id)}
                      >
                        <Button
                          variant="success"
                          size="sm"
                          className="w-full"
                          disabled={isTracking}
                        >
                          Send WhatsApp
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
