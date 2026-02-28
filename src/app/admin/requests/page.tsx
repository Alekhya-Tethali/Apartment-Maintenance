"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useToast } from "@/hooks/useToast";
import { apiGetRequests, apiReviewRequest } from "@/lib/api-client";
import type { UpdateRequestData, TenantInfoRequestPayload, AmountRequestPayload } from "@/lib/types";

export default function AdminRequests() {
  const { data: requests, loading, refetch } = useApiQuery(apiGetRequests);
  const { toast, showToast, clearToast } = useToast();
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectNoteId, setRejectNoteId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const handleReview = async (requestId: number, action: "approve" | "reject") => {
    setActionId(requestId);
    try {
      await apiReviewRequest({
        requestId,
        action,
        adminNote: action === "reject" ? rejectNote : undefined,
      });
      showToast(action === "approve" ? "Approved!" : "Rejected", "success");
      setRejectNoteId(null);
      setRejectNote("");
      refetch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setActionId(null);
    }
  };

  const allRequests = requests || [];
  const pending = allRequests.filter((r) => r.status === "pending");
  const reviewed = allRequests.filter((r) => r.status !== "pending");

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
      <NavBar title="Update Requests" backHref="/admin/months" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {pending.length === 0 && reviewed.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">No requests yet.</p>
          </Card>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">
                  Pending ({pending.length})
                </h3>
                {pending.map((req) => {
                  const data = JSON.parse(req.requestData);
                  return (
                    <Card key={req.id}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-800">Flat {req.flatNumber}</div>
                            <div className="text-xs text-slate-400">
                              {req.requestType === "tenant_info" ? "Tenant Info Update" : "Amount Change"}
                              {" · "}
                              {new Date(req.requestedAt).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                            Pending
                          </span>
                        </div>

                        {/* Request details */}
                        <div className="bg-slate-50 rounded-lg p-2 text-sm text-slate-700 space-y-1">
                          {req.requestType === "tenant_info" ? (
                            <>
                              {(data as TenantInfoRequestPayload).ownerName && (
                                <div>Owner: <strong>{(data as TenantInfoRequestPayload).ownerName}</strong></div>
                              )}
                              <div>Rented: <strong>{(data as TenantInfoRequestPayload).isRented ? "Yes" : "No"}</strong></div>
                              {(data as TenantInfoRequestPayload).tenantName && (
                                <div>Tenant: <strong>{(data as TenantInfoRequestPayload).tenantName}</strong></div>
                              )}
                            </>
                          ) : (
                            <>
                              <div>Amount: <strong>₹{(data as AmountRequestPayload).amount.toLocaleString("en-IN")}</strong></div>
                              <div>Scope: <strong>{(data as AmountRequestPayload).scope === "this_month" ? "This month only" : "All future months"}</strong></div>
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        {rejectNoteId === req.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="Reason for rejection (optional)..."
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setRejectNoteId(null); setRejectNote(""); }}>
                                Cancel
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleReview(req.id, "reject")}
                                loading={actionId === req.id}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleReview(req.id, "approve")}
                              loading={actionId === req.id}
                              className="!w-auto"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setRejectNoteId(req.id)}
                              className="!w-auto"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Reviewed */}
            {reviewed.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">
                  History
                </h3>
                {reviewed.slice(0, 10).map((req) => (
                  <Card key={req.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-slate-700">Flat {req.flatNumber}</div>
                        <div className="text-xs text-slate-400">
                          {req.requestType === "tenant_info" ? "Tenant Info" : "Amount"} ·{" "}
                          {new Date(req.requestedAt).toLocaleDateString("en-IN")}
                        </div>
                        {req.adminNote && (
                          <div className="text-xs text-slate-500 mt-1">Note: {req.adminNote}</div>
                        )}
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          req.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {req.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
