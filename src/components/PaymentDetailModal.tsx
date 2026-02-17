"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import StatusBadge from "@/components/StatusBadge";
import {
  PAYMENT_MODE_LABELS,
  MONTH_NAMES,
  PAYMENT_STATUS,
  type Role,
} from "@/lib/constants";
import { formatPaymentDate } from "@/lib/types";
import type { PaymentData } from "@/lib/types";

interface PaymentDetailModalProps {
  payment: PaymentData | null;
  onClose: () => void;
  role?: Role;
  securityName?: string;
  adminName?: string;
  /** Called after a successful admin action to refresh data */
  onUpdate?: () => void;
}

export default function PaymentDetailModal({
  payment,
  onClose,
  role,
  securityName,
  adminName,
  onUpdate,
}: PaymentDetailModalProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showStatusOverride, setShowStatusOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<string>("");
  const [overrideNote, setOverrideNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!payment) return null;

  const isAdmin = role === "admin";
  const monthLabel = payment.month && payment.year
    ? `${MONTH_NAMES[payment.month - 1]} ${payment.year}`
    : `Month #${payment.monthId}`;

  const viewScreenshot = () => {
    setScreenshotUrl(`/api/screenshots?paymentId=${payment.id}`);
    setScreenshotLoading(true);
    setScreenshotError(false);
  };

  const closeScreenshot = () => {
    setScreenshotUrl(null);
    setScreenshotLoading(false);
    setScreenshotError(false);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (res.ok) {
        setSuccess("Payment approved!");
        onUpdate?.();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to approve");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, reason: rejectNote }),
      });
      if (res.ok) {
        setSuccess("Payment rejected");
        setShowRejectForm(false);
        onUpdate?.();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reject");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCollect = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      if (res.ok) {
        setSuccess("Cash collected!");
        onUpdate?.();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to collect");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusOverride = async () => {
    if (!overrideStatus) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/admin-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          status: overrideStatus,
          adminNote: overrideNote || undefined,
        }),
      });
      if (res.ok) {
        setSuccess("Status updated!");
        setShowStatusOverride(false);
        onUpdate?.();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update");
      }
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  // Determine which primary actions are available
  const isClosedMonth = payment.monthStatus === "closed";
  const canApprove = isAdmin && !isClosedMonth && payment.status === "pending_verification";
  const canReject = isAdmin && !isClosedMonth && payment.status === "pending_verification";
  const canCollect = isAdmin && !isClosedMonth && payment.status === "pending_collection";
  const canOverride = isAdmin && !isClosedMonth && payment.status !== "paid";
  const hasActions = canApprove || canReject || canCollect || canOverride;

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
              <h3 className="text-lg font-bold text-slate-800">
                Flat {payment.flatNumber}
              </h3>
              <span className="text-sm text-slate-500">{monthLabel}</span>
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

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[70vh] space-y-4">
            {/* Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Status</span>
              <StatusBadge
                status={payment.status}
                securityName={securityName}
                adminName={adminName}
                role={role}
              />
            </div>

            {/* Amount */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Amount</span>
              <span className="text-lg font-bold text-slate-800">
                ₹{payment.amount.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Payment Mode */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Payment Mode</span>
              <span className="font-medium text-slate-700">
                {PAYMENT_MODE_LABELS[payment.paymentMode]}
              </span>
            </div>

            {/* Dates */}
            {payment.paymentDate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Payment Date</span>
                <span className="text-sm text-slate-700">
                  {formatPaymentDate(payment.paymentDate)}
                </span>
              </div>
            )}
            {payment.submittedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Submitted</span>
                <span className="text-sm text-slate-700">
                  {formatPaymentDate(payment.submittedAt)}
                </span>
              </div>
            )}
            {payment.securityConfirmedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Security Confirmed</span>
                <span className="text-sm text-slate-700">
                  {formatPaymentDate(payment.securityConfirmedAt)}
                </span>
              </div>
            )}
            {payment.verifiedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Admin Verified</span>
                <span className="text-sm text-slate-700">
                  {formatPaymentDate(payment.verifiedAt)}
                </span>
              </div>
            )}
            {payment.collectedAt && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Cash Collected</span>
                <span className="text-sm text-slate-700">
                  {formatPaymentDate(payment.collectedAt)}
                </span>
              </div>
            )}

            {/* Admin Note */}
            {payment.adminNote && (
              <div className="bg-rose-50 p-3 rounded-xl text-sm text-rose-700">
                <strong>Admin Note:</strong> {payment.adminNote}
              </div>
            )}

            {/* Screenshot — admin only */}
            {isAdmin && payment.hasScreenshot && (
              <div>
                <Button variant="outline" size="sm" onClick={viewScreenshot}>
                  View Screenshot
                </Button>
              </div>
            )}

            {/* Feedback messages */}
            {error && (
              <div className="bg-rose-50 p-3 rounded-xl text-sm text-rose-700">{error}</div>
            )}
            {success && (
              <div className="bg-emerald-50 p-3 rounded-xl text-sm text-emerald-700">{success}</div>
            )}

            {/* Admin Actions — only for open months with actionable states */}
            {hasActions && !success && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</h4>

                {/* Primary flow actions */}
                <div className="flex flex-wrap gap-2">
                  {canApprove && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleApprove}
                      loading={actionLoading}
                    >
                      Approve
                    </Button>
                  )}
                  {canReject && !showRejectForm && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowRejectForm(true)}
                    >
                      Reject
                    </Button>
                  )}
                  {canCollect && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleCollect}
                      loading={actionLoading}
                    >
                      Mark Collected
                    </Button>
                  )}
                  {canOverride && !showStatusOverride && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowStatusOverride(true)}
                    >
                      Override Status
                    </Button>
                  )}
                </div>

                {/* Reject form */}
                {showRejectForm && (
                  <div className="space-y-2">
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="w-full p-3 border-2 border-slate-300 rounded-xl resize-none h-20 focus:border-rose-500 outline-none text-sm"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setShowRejectForm(false); setRejectNote(""); }}>
                        Cancel
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleReject}
                        loading={actionLoading}
                        disabled={!rejectNote.trim()}
                      >
                        Confirm Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status override form */}
                {showStatusOverride && (
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl">
                    <label className="text-xs text-slate-500">Set Status To</label>
                    <select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                    >
                      <option value="">Select status...</option>
                      <option value={PAYMENT_STATUS.PAID}>Paid / Collected</option>
                      <option value={PAYMENT_STATUS.PENDING_VERIFICATION}>Pending Verification</option>
                      <option value={PAYMENT_STATUS.PENDING_SECURITY}>Pending Security Confirmation</option>
                      <option value={PAYMENT_STATUS.PENDING_COLLECTION}>Pending Collection</option>
                      <option value={PAYMENT_STATUS.REJECTED}>Rejected</option>
                    </select>
                    <div>
                      <label className="text-xs text-slate-500">Note (optional)</label>
                      <input
                        type="text"
                        value={overrideNote}
                        onChange={(e) => setOverrideNote(e.target.value)}
                        placeholder="Reason for override..."
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setShowStatusOverride(false); setOverrideStatus(""); setOverrideNote(""); }}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleStatusOverride}
                        loading={actionLoading}
                        disabled={!overrideStatus}
                      >
                        Update Status
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screenshot lightbox — higher z-index */}
      {screenshotUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
          onClick={closeScreenshot}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {screenshotLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            )}
            {screenshotError ? (
              <div className="text-center py-8">
                <p className="text-rose-500 text-sm">Failed to load screenshot</p>
              </div>
            ) : (
              <img
                src={screenshotUrl}
                alt="Payment screenshot"
                className={`w-full rounded-xl ${screenshotLoading ? "hidden" : ""}`}
                onLoad={() => setScreenshotLoading(false)}
                onError={() => {
                  setScreenshotLoading(false);
                  setScreenshotError(true);
                }}
              />
            )}
            <Button onClick={closeScreenshot} variant="outline" size="sm" className="mt-2">
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
