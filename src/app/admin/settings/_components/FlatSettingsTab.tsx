"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { FlatData } from "@/lib/types";
import { apiUpdateFlat } from "@/lib/api-client";

interface FlatSettingsTabProps {
  flats: FlatData[];
  onSaved: () => void;
  showToast: (message: string, type: "success" | "error") => void;
}

export default function FlatSettingsTab({ flats, onSaved, showToast }: FlatSettingsTabProps) {
  const [editingFlat, setEditingFlat] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editIsRented, setEditIsRented] = useState(false);
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantPhone, setEditTenantPhone] = useState("");
  const [showAmountScope, setShowAmountScope] = useState(false);
  const [originalAmount, setOriginalAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = (flat: FlatData) => {
    setEditingFlat(flat.id);
    setEditAmount(flat.maintenanceAmount.toString());
    setOriginalAmount(flat.maintenanceAmount.toString());
    setEditPin("");
    setEditPhone(flat.ownerPhone || "");
    setEditOwnerName(flat.ownerName || "");
    setEditIsRented(flat.isRented || false);
    setEditTenantName(flat.tenantName || "");
    setEditTenantPhone(flat.tenantPhone || "");
  };

  const handleSaveFlat = async (amountScope?: "this_month" | "all_future") => {
    if (!editingFlat) return;

    const amountChanged = editAmount !== originalAmount;
    if (amountChanged && !amountScope) {
      setShowAmountScope(true);
      return;
    }

    setSaving(true);
    setShowAmountScope(false);

    const updates: Record<string, unknown> = { flatId: editingFlat };
    if (editAmount) updates.maintenanceAmount = parseFloat(editAmount);
    if (editPin) updates.pin = editPin;
    if (editPhone) updates.phone = editPhone;
    updates.ownerName = editOwnerName;
    updates.isRented = editIsRented;
    updates.tenantName = editTenantName;
    if (editTenantPhone) updates.tenantPhone = editTenantPhone;
    if (amountScope) updates.amountScope = amountScope;

    try {
      await apiUpdateFlat(updates as Parameters<typeof apiUpdateFlat>[0]);
      showToast("Flat updated!", "success");
      setEditingFlat(null);
      onSaved();
    } catch {
      showToast("Failed to save flat", "error");
    } finally {
      setSaving(false);
    }
  };

  const flat = editingFlat ? flats.find((f) => f.id === editingFlat) : null;

  return (
    <div className="space-y-3">
      {/* Compact grid of flats */}
      <div className="grid grid-cols-3 gap-2">
        {flats.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              if (editingFlat === f.id) {
                setEditingFlat(null);
              } else {
                startEditing(f);
              }
            }}
            className={`rounded-xl p-3 text-center transition-all border-2
              ${editingFlat === f.id
                ? "bg-indigo-50 border-indigo-500 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-95"}`}
          >
            <div className="text-xl font-bold text-slate-800">{f.flatNumber}</div>
            <div className="text-xs text-slate-500 mt-0.5">₹{f.maintenanceAmount.toLocaleString("en-IN")}</div>
            {f.ownerName && (
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">{f.ownerName}</div>
            )}
            {f.isRented && f.tenantName && (
              <div className="text-[10px] text-amber-600 mt-0.5 truncate">{f.tenantName}</div>
            )}
          </button>
        ))}
      </div>

      {/* Edit panel */}
      {flat && (
        <Card>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="font-bold text-lg text-slate-800">Flat {flat.flatNumber}</div>
              <button
                onClick={() => { setEditingFlat(null); setShowAmountScope(false); }}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-500">Owner Name</label>
              <input type="text" value={editOwnerName} onChange={(e) => setEditOwnerName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Flat owner name" />
            </div>
            <div>
              <label className="text-xs text-slate-500">Owner Phone (with country code)</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="919876543210" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editIsRented} onChange={(e) => setEditIsRented(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-slate-700">Currently rented out</span>
            </label>

            {editIsRented && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Tenant Name</label>
                  <input type="text" value={editTenantName} onChange={(e) => setEditTenantName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Current tenant name" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Tenant Phone (with country code)</label>
                  <input type="tel" value={editTenantPhone} onChange={(e) => setEditTenantPhone(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="919876543210" />
                </div>
              </>
            )}

            <hr className="border-slate-100" />

            <div>
              <label className="text-xs text-slate-500">Maintenance Amount (₹)</label>
              <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500">New PIN (4 digits, leave empty to keep)</label>
              <input type="text" maxLength={4} value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="••••" />
            </div>

            {showAmountScope && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="text-sm font-medium text-amber-800">How should the amount change apply?</div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveFlat("this_month")} className="flex-1 px-3 py-2 text-xs font-semibold bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors">
                    This month only
                  </button>
                  <button onClick={() => handleSaveFlat("all_future")} className="flex-1 px-3 py-2 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-lg hover:bg-indigo-200 transition-colors">
                    All future months
                  </button>
                </div>
              </div>
            )}

            {!showAmountScope && (
              <Button variant="success" size="sm" loading={saving} onClick={() => handleSaveFlat()}>
                Save Changes
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
