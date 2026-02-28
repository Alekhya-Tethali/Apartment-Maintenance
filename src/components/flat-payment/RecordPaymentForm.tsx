"use client";

import { useState } from "react";
import { MONTH_NAMES } from "@/lib/constants";
import type { FlatStatus, FlatData, MonthData } from "@/lib/types";
import { apiAdminCreatePayment } from "@/lib/api-client";

interface RecordPaymentFormProps {
  flat: FlatStatus;
  flatDetails?: FlatData | null;
  selectedMonth: MonthData;
  onSuccess: () => void;
}

export default function RecordPaymentForm({
  flat,
  flatDetails,
  selectedMonth,
  onSuccess,
}: RecordPaymentFormProps) {
  const [recordPaymentType, setRecordPaymentType] = useState<"cash" | "upi">("cash");
  const [recordUpiApp, setRecordUpiApp] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split("T")[0]);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const recordMode = recordPaymentType === "cash"
    ? "cash"
    : recordUpiApp === "other"
      ? "upi_other"
      : recordUpiApp;

  const handleRecordPayment = async () => {
    if (recordPaymentType === "upi" && !recordUpiApp) {
      setRecordError("Please select which UPI app");
      return;
    }
    setRecordingPayment(true);
    setRecordError(null);
    try {
      await apiAdminCreatePayment({
        flatId: flat.flatId,
        monthId: selectedMonth.id,
        amount: flat.amount,
        paymentMode: recordMode,
        status: "paid",
        paymentDate: new Date(recordDate).toISOString(),
        adminNote: "Recorded by admin",
      });
      onSuccess();
    } catch (e) {
      setRecordError(e instanceof Error ? e.message : "Failed to record");
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <div className="mb-4 border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-3 space-y-2">
      <div>
        <div className="text-sm font-semibold text-amber-800">
          No payment for {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
        </div>
        <div className="text-xs text-amber-600">
          Flat {flat.flatNumber} — ₹{flat.amount.toLocaleString("en-IN")}
        </div>
        {flatDetails?.ownerName && (
          <div className="text-xs text-amber-700 mt-1">
            Owner: {flatDetails.ownerName}
            {flatDetails.isRented && flatDetails.tenantName && (
              <span> · Tenant: {flatDetails.tenantName}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-1.5 mb-2">
        {(["cash", "upi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setRecordPaymentType(t); if (t === "cash") setRecordUpiApp(""); else setRecordUpiApp("gpay"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              recordPaymentType === t
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {t === "cash" ? "Cash" : "UPI"}
          </button>
        ))}
      </div>
      {recordPaymentType === "upi" && (
        <div className="flex gap-1.5 mb-2">
          {[{ value: "gpay", label: "GPay" }, { value: "phonepe", label: "PhonePe" }, { value: "other", label: "Other" }].map((app) => (
            <button
              key={app.value}
              onClick={() => setRecordUpiApp(app.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                recordUpiApp === app.value
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {app.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="px-2 py-1.5 border rounded-lg text-xs bg-white flex-shrink-0"
        />
        <button
          onClick={handleRecordPayment}
          disabled={recordingPayment || (recordPaymentType === "upi" && !recordUpiApp)}
          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {recordingPayment ? "Recording..." : "Record as Paid"}
        </button>
      </div>
      {recordError && <div className="text-xs text-rose-600">{recordError}</div>}
    </div>
  );
}
