"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { PAYMENT_MODE_LABELS, MONTH_NAMES } from "@/lib/constants";
import { useAppConfig } from "@/hooks/useAppConfig";
import type { PaymentData } from "@/lib/types";

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const { securityName, adminName } = useAppConfig();

  useEffect(() => {
    fetch("/api/payments")
      .then((res) => res.json())
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Payment History" backHref="/resident" />
      <main className="max-w-lg mx-auto p-4 space-y-2">
        {payments.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">No payments yet.</p>
          </Card>
        ) : (
          payments.map((p) => (
            <Card key={p.id} className="flex justify-between items-center">
              <div>
                <div className="font-medium text-slate-800">
                  {MONTH_NAMES[p.month - 1]} {p.year}
                </div>
                <div className="text-sm text-slate-500">
                  ₹{p.amount.toLocaleString("en-IN")} via{" "}
                  {PAYMENT_MODE_LABELS[p.paymentMode]}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(p.submittedAt).toLocaleDateString("en-IN")}
                </div>
              </div>
              <StatusBadge status={p.status} securityName={securityName} adminName={adminName} role="resident" />
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
