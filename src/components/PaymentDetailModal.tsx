"use client";

import { useState } from "react";
import { MONTH_NAMES, type Role } from "@/lib/constants";
import type { PaymentData } from "@/lib/types";
import PaymentInfo from "@/components/payment-detail/PaymentInfo";
import PaymentActions from "@/components/payment-detail/PaymentActions";
import ScreenshotLightbox from "@/components/payment-detail/ScreenshotLightbox";

interface PaymentDetailModalProps {
  payment: PaymentData | null;
  onClose: () => void;
  role?: Role;
  securityName?: string;
  adminName?: string;
  ownerName?: string | null;
  tenantName?: string | null;
  onUpdate?: () => void;
}

export default function PaymentDetailModal({
  payment,
  onClose,
  role,
  securityName,
  adminName,
  ownerName,
  tenantName,
  onUpdate,
}: PaymentDetailModalProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!payment) return null;

  const isAdmin = role === "admin";
  const monthLabel = payment.month && payment.year
    ? `${MONTH_NAMES[payment.month - 1]} ${payment.year}`
    : `Month #${payment.monthId}`;

  const isClosedMonth = payment.monthStatus === "closed";
  const hasActions = isAdmin && !isClosedMonth;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Flat {payment.flatNumber}</h3>
              <span className="text-sm text-slate-500">{monthLabel}</span>
              {(ownerName || tenantName) && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {ownerName}{tenantName ? ` · Tenant: ${tenantName}` : ""}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
            <PaymentInfo
              payment={payment}
              role={role}
              securityName={securityName}
              adminName={adminName}
              onViewScreenshot={() => setScreenshotUrl(`/api/screenshots?paymentId=${payment.id}`)}
            />

            {error && <div className="bg-rose-50 p-3 rounded-xl text-sm text-rose-700">{error}</div>}
            {success && <div className="bg-emerald-50 p-3 rounded-xl text-sm text-emerald-700">{success}</div>}

            {hasActions && !success && (
              <PaymentActions
                payment={payment}
                onUpdate={onUpdate}
                onError={setError}
                onSuccess={setSuccess}
              />
            )}
          </div>
        </div>
      </div>

      {screenshotUrl && (
        <ScreenshotLightbox url={screenshotUrl} onClose={() => setScreenshotUrl(null)} />
      )}
    </>
  );
}
