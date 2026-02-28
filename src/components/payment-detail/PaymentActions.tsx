"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { PAYMENT_STATUS } from "@/lib/constants";
import type { PaymentData } from "@/lib/types";
import {
  apiApprovePayment,
  apiRejectPayment,
  apiCollectPayment,
  apiAdminUpdatePayment,
  apiDeletePayment,
} from "@/lib/api-client";

interface PaymentActionsProps {
  payment: PaymentData;
  onUpdate?: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function PaymentActions({ payment, onUpdate, onError, onSuccess }: PaymentActionsProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showStatusOverride, setShowStatusOverride] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentType, setEditPaymentType] = useState<"cash" | "upi">("cash");
  const [editUpiApp, setEditUpiApp] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");

  const isClosedMonth = payment.monthStatus === "closed";
  const canApprove = !isClosedMonth && payment.status === "pending_verification";
  const canReject = !isClosedMonth && payment.status === "pending_verification";
  const canCollect = !isClosedMonth && payment.status === "pending_collection";
  const canOverride = !isClosedMonth && payment.status !== "paid";
  const canEdit = !isClosedMonth;
  const canDelete = !isClosedMonth;

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await fn();
      onSuccess(label);
      onUpdate?.();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = () => runAction("Payment approved!", () => apiApprovePayment(payment.id));
  const handleCollect = () => runAction("Cash collected!", () => apiCollectPayment(payment.id));

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    await runAction("Payment rejected", () => apiRejectPayment(payment.id, rejectNote));
    setShowRejectForm(false);
  };

  const handleStatusOverride = async () => {
    if (!overrideStatus) return;
    await runAction("Status updated!", () =>
      apiAdminUpdatePayment({ paymentId: payment.id, status: overrideStatus, adminNote: overrideNote || undefined }),
    );
    setShowStatusOverride(false);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiDeletePayment(payment.id);
      onSuccess("Payment deleted");
      onUpdate?.();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const openEditForm = () => {
    setEditAmount(payment.amount.toString());
    if (payment.paymentMode === "cash") {
      setEditPaymentType("cash");
      setEditUpiApp("");
    } else {
      setEditPaymentType("upi");
      setEditUpiApp(payment.paymentMode === "upi_other" ? "other" : payment.paymentMode);
    }
    setEditDate(payment.paymentDate ? payment.paymentDate.split("T")[0] : "");
    setEditNote(payment.adminNote || "");
    setShowEditForm(true);
  };

  const editMode = editPaymentType === "cash" ? "cash" : editUpiApp === "other" ? "upi_other" : editUpiApp;

  const handleEditSave = async () => {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { paymentId: payment.id };
      if (editAmount && parseFloat(editAmount) !== payment.amount) body.amount = parseFloat(editAmount);
      if (editMode && editMode !== payment.paymentMode) body.paymentMode = editMode;
      if (editDate) {
        const newDate = new Date(editDate).toISOString();
        if (newDate !== payment.paymentDate) body.paymentDate = newDate;
      }
      if (editNote !== (payment.adminNote || "")) body.adminNote = editNote;

      if (Object.keys(body).length <= 1) {
        onError("No changes to save");
        setActionLoading(false);
        return;
      }

      await apiAdminUpdatePayment(body as Parameters<typeof apiAdminUpdatePayment>[0]);
      onSuccess("Payment updated!");
      setShowEditForm(false);
      onUpdate?.();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-200 pt-4 space-y-3">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</h4>

      <div className="flex flex-wrap gap-2">
        {canApprove && (
          <Button variant="success" size="sm" onClick={handleApprove} loading={actionLoading}>Approve</Button>
        )}
        {canReject && !showRejectForm && (
          <Button variant="danger" size="sm" onClick={() => setShowRejectForm(true)}>Reject</Button>
        )}
        {canCollect && (
          <Button variant="success" size="sm" onClick={handleCollect} loading={actionLoading}>Mark Collected</Button>
        )}
        {canOverride && !showStatusOverride && (
          <Button variant="outline" size="sm" onClick={() => setShowStatusOverride(true)}>Override Status</Button>
        )}
        {canEdit && !showEditForm && (
          <Button variant="outline" size="sm" onClick={openEditForm}>Edit Payment</Button>
        )}
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <div className="space-y-2">
          <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason for rejection..." className="w-full p-3 border-2 border-slate-300 rounded-xl resize-none h-20 focus:border-rose-500 outline-none text-sm" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowRejectForm(false); setRejectNote(""); }}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleReject} loading={actionLoading} disabled={!rejectNote.trim()}>Confirm Reject</Button>
          </div>
        </div>
      )}

      {/* Status override form */}
      {showStatusOverride && (
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl">
          <label className="text-xs text-slate-500">Set Status To</label>
          <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">Select status...</option>
            <option value={PAYMENT_STATUS.PAID}>Paid / Collected</option>
            <option value={PAYMENT_STATUS.PENDING_VERIFICATION}>Pending Verification</option>
            <option value={PAYMENT_STATUS.PENDING_SECURITY}>Pending Security Confirmation</option>
            <option value={PAYMENT_STATUS.PENDING_COLLECTION}>Pending Collection</option>
            <option value={PAYMENT_STATUS.REJECTED}>Rejected</option>
          </select>
          <div>
            <label className="text-xs text-slate-500">Note (optional)</label>
            <input type="text" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} placeholder="Reason for override..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowStatusOverride(false); setOverrideStatus(""); setOverrideNote(""); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleStatusOverride} loading={actionLoading} disabled={!overrideStatus}>Update Status</Button>
          </div>
        </div>
      )}

      {/* Edit payment form */}
      {showEditForm && (
        <div className="space-y-2 bg-slate-50 p-3 rounded-xl">
          <div>
            <label className="text-xs text-slate-500">Amount (₹)</label>
            <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Payment Mode</label>
            <div className="flex gap-1.5 mt-1">
              {(["cash", "upi"] as const).map((t) => (
                <button key={t} onClick={() => { setEditPaymentType(t); if (t === "cash") setEditUpiApp(""); else setEditUpiApp("gpay"); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${editPaymentType === t ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {t === "cash" ? "Cash" : "UPI"}
                </button>
              ))}
            </div>
            {editPaymentType === "upi" && (
              <div className="flex gap-1.5 mt-1.5">
                {[{ value: "gpay", label: "GPay" }, { value: "phonepe", label: "PhonePe" }, { value: "other", label: "Other" }].map((app) => (
                  <button key={app.value} onClick={() => setEditUpiApp(app.value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${editUpiApp === app.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    {app.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500">Payment Date</label>
            <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} max={new Date().toISOString().split("T")[0]} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Admin Note</label>
            <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Optional note..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setShowEditForm(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleEditSave} loading={actionLoading}>Save Changes</Button>
          </div>
        </div>
      )}

      {/* Delete payment */}
      {canDelete && (
        <div className="border-t border-slate-100 pt-3">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-xs text-rose-500 hover:text-rose-700 transition-colors">
              Delete this payment
            </button>
          ) : (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
              <div className="text-sm text-rose-700">Are you sure? This cannot be undone.</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={handleDelete} loading={deleteLoading}>Delete</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
