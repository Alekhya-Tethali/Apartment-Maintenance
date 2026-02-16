"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/StatusBadge";
import { PAYMENT_MODE_LABELS, type PaymentStatus, type PaymentMode } from "@/lib/constants";

interface PaymentData {
  id: number;
  month: number;
  year: number;
  amount: number;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  submittedAt: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/payments")
      .then((res) => res.json())
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
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
              <StatusBadge status={p.status} />
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
