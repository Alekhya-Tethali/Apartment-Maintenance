"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { apiGetFlats, apiGetMonths, apiGetPayments, apiGetConfig, apiGetReminders, apiTrackReminder } from "@/lib/api-client";
import { formatReminderMessage, formatRelativeDate, getLatestReminder } from "@/lib/reminder-helpers";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { MONTH_NAMES } from "@/lib/constants";
import type { FlatData, MonthData, PaymentData, ReminderData } from "@/lib/types";

export default function RemindDefaultersPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <RemindDefaulters />
    </Suspense>
  );
}

function RemindDefaulters() {
  const searchParams = useSearchParams();
  const urlMonthId = searchParams.get("monthId");
  const [defaulters, setDefaulters] = useState<
    { flat: FlatData; message: string; whatsappLink: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<MonthData | null>(null);
  const { toast, showToast, clearToast } = useToast();
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [trackingIds, setTrackingIds] = useState<Set<number>>(new Set());

  const loadReminders = useCallback(async (monthId: number) => {
    try {
      const data = await apiGetReminders(monthId);
      setReminders(data);
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
      const [flatsData, monthsData, paymentsData, configData] = await Promise.all([
        apiGetFlats(),
        apiGetMonths(),
        apiGetPayments(),
        apiGetConfig().catch(() => ({} as Record<string, string | undefined>)),
      ]);

      const webappUrl = configData.webapp_url || null;

      // Use URL monthId if provided, otherwise fall back to first open month
      let targetMonth: MonthData | undefined;
      if (urlMonthId) {
        targetMonth = monthsData.find((m: MonthData) => m.id === parseInt(urlMonthId));
      }
      if (!targetMonth) {
        targetMonth = monthsData.find((m) => m.status === "open");
      }
      setCurrentMonth(targetMonth || null);

      if (targetMonth) {
        const monthLabel = `${MONTH_NAMES[targetMonth.month - 1]} ${targetMonth.year}`;
        const paidFlatIds = paymentsData
          .filter(
            (p) =>
              p.monthId === targetMonth.id && p.status !== "rejected"
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
              webappUrl,
            );
            return {
              flat,
              message,
              whatsappLink: flat.ownerPhone
                ? generateWhatsAppLink(flat.ownerPhone, message)
                : null,
            };
          })
        );

        // Load reminder history for this month
        await loadReminders(targetMonth.id);
      }
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  async function trackReminderForFlat(flatId: number) {
    if (!currentMonth) return;

    setTrackingIds((prev) => new Set(prev).add(flatId));

    try {
      await apiTrackReminder(flatId, currentMonth.id);
      // Refresh reminders list to show the new entry
      await loadReminders(currentMonth.id);
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
    showToast("Message copied!", "success");
    trackReminderForFlat(flatId);
  };

  const handleWhatsApp = (flatId: number) => {
    trackReminderForFlat(flatId);
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}
      <NavBar title="Remind Defaulters" backHref="/admin/months" />

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
            const lastReminder = getLatestReminder(reminders, flat.id);
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
