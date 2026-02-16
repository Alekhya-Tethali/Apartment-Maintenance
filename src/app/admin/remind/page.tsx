"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { formatWhatsAppReminder } from "@/lib/telegram";

interface FlatData {
  id: number;
  flatNumber: string;
  maintenanceAmount: number;
  phone?: string;
}

interface MonthData {
  id: number;
  month: number;
  year: number;
  status: string;
}

interface PaymentData {
  flatId: number;
  monthId: number;
  status: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RemindDefaulters() {
  const [defaulters, setDefaulters] = useState<
    { flat: FlatData; message: string; whatsappLink: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<MonthData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [flatsRes, monthsRes, paymentsRes] = await Promise.all([
        fetch("/api/flats"),
        fetch("/api/months"),
        fetch("/api/payments"),
      ]);

      const flatsData: FlatData[] = await flatsRes.json();
      const monthsData: MonthData[] = await monthsRes.json();
      const paymentsData: PaymentData[] = await paymentsRes.json();

      const openMonth = monthsData.find(
        (m) => m.status === "open"
      );
      setCurrentMonth(openMonth || null);

      if (openMonth) {
        const monthLabel = `${MONTH_NAMES[openMonth.month - 1]} ${openMonth.year}`;
        const paidFlatIds = paymentsData
          .filter(
            (p) =>
              p.monthId === openMonth.id &&
              p.status !== "rejected"
          )
          .map((p) => p.flatId);

        const defaulterFlats = flatsData.filter(
          (f) => !paidFlatIds.includes(f.id)
        );

        setDefaulters(
          defaulterFlats.map((flat) => {
            const message = formatWhatsAppReminder(
              flat.flatNumber,
              flat.maintenanceAmount,
              monthLabel
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
      }
    } catch {
      setToast({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const copyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    setToast({ message: "Message copied!", type: "info" });
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
      <NavBar title="Remind Defaulters" backHref="/admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {currentMonth && (
          <Card className="bg-red-50 border-red-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-700">
                {defaulters.length}
              </div>
              <div className="text-sm text-red-600">
                Unpaid flats for {MONTH_NAMES[currentMonth.month - 1]} {currentMonth.year}
              </div>
            </div>
          </Card>
        )}

        {defaulters.length === 0 ? (
          <Card>
            <p className="text-green-600 text-center py-4 font-medium">
              All flats have paid! No reminders needed.
            </p>
          </Card>
        ) : (
          defaulters.map(({ flat, message, whatsappLink }) => (
            <Card key={flat.id}>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-lg text-slate-800">
                    Flat {flat.flatNumber}
                  </div>
                  <div className="text-lg font-semibold text-red-600">
                    ₹{flat.maintenanceAmount.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600">
                  {message}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyMessage(message)}
                  >
                    Copy Message
                  </Button>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="success" size="sm" className="w-full">
                        Send WhatsApp
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
