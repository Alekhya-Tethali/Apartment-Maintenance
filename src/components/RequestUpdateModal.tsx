"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { apiSubmitRequest, ApiError } from "@/lib/api-client";

interface RequestUpdateModalProps {
  flatId: number;
  flatNumber: string;
  currentOwnerName?: string;
  currentIsRented?: boolean;
  currentTenantName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type RequestTab = "tenant_info" | "amount";

export default function RequestUpdateModal({
  flatId,
  flatNumber,
  currentOwnerName,
  currentIsRented,
  currentTenantName,
  onClose,
  onSuccess,
}: RequestUpdateModalProps) {
  const [tab, setTab] = useState<RequestTab>("tenant_info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tenant info fields
  const [ownerName, setOwnerName] = useState(currentOwnerName || "");
  const [isRented, setIsRented] = useState(currentIsRented || false);
  const [tenantName, setTenantName] = useState(currentTenantName || "");
  const [tenantPhone, setTenantPhone] = useState("");

  // Amount fields
  const [amount, setAmount] = useState("");
  const [amountScope, setAmountScope] = useState<"this_month" | "all_future">("this_month");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    let requestData: string;
    if (tab === "tenant_info") {
      requestData = JSON.stringify({
        ownerName: ownerName || undefined,
        isRented,
        tenantName: isRented ? tenantName : undefined,
        tenantPhone: isRented && tenantPhone ? tenantPhone : undefined,
      });
    } else {
      if (!amount || parseFloat(amount) <= 0) {
        setError("Enter a valid amount");
        setSubmitting(false);
        return;
      }
      requestData = JSON.stringify({
        amount: parseFloat(amount),
        scope: amountScope,
      });
    }

    try {
      await apiSubmitRequest({ flatId, requestType: tab, requestData });
      setSuccessMsg("Request submitted! Admin will review it.");
      setTimeout(() => onSuccess(), 1500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[65] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Request Update</h3>
            <span className="text-sm text-slate-500">Flat {flatNumber}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-100 px-4">
          {([
            { key: "tenant_info" as const, label: "Tenant Info" },
            { key: "amount" as const, label: "Amount Change" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setError(null); setSuccessMsg(null); }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
          {tab === "tenant_info" ? (
            <>
              <div>
                <label className="text-xs text-slate-500">Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  placeholder="Flat owner name"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRented}
                  onChange={(e) => setIsRented(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">Currently rented out</span>
              </label>
              {isRented && (
                <>
                  <div>
                    <label className="text-xs text-slate-500">Tenant Name</label>
                    <input
                      type="text"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder="Current tenant name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Tenant Phone (with country code)</label>
                    <input
                      type="tel"
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      placeholder="919876543210"
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-500">Proposed Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                  placeholder="e.g. 2500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-500">Apply to</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAmountScope("this_month")}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                      ${amountScope === "this_month"
                        ? "bg-indigo-100 text-indigo-800 border-2 border-indigo-300"
                        : "bg-slate-100 text-slate-600 border-2 border-transparent"
                      }`}
                  >
                    This month only
                  </button>
                  <button
                    onClick={() => setAmountScope("all_future")}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors
                      ${amountScope === "all_future"
                        ? "bg-indigo-100 text-indigo-800 border-2 border-indigo-300"
                        : "bg-slate-100 text-slate-600 border-2 border-transparent"
                      }`}
                  >
                    All future months
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-rose-50 p-3 rounded-xl text-sm text-rose-700">{error}</div>
          )}
          {successMsg && (
            <div className="bg-emerald-50 p-3 rounded-xl text-sm text-emerald-700">{successMsg}</div>
          )}

          {!successMsg && (
            <Button onClick={handleSubmit} loading={submitting} variant="primary" size="sm">
              Submit Request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
