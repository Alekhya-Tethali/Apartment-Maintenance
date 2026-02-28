"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { apiSubmitPayment, apiUploadScreenshot } from "@/lib/api-client";

export default function SubmitPaymentPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <SubmitPayment />
    </Suspense>
  );
}

function SubmitPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthId = searchParams.get("monthId");

  const [paymentType, setPaymentType] = useState<"" | "upi" | "cash">("");
  const [upiApp, setUpiApp] = useState<string>("");
  const [customUpiApp, setCustomUpiApp] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [skipScreenshot, setSkipScreenshot] = useState(false);

  // Derive the actual paymentMode for API
  const paymentMode = paymentType === "cash"
    ? "cash"
    : upiApp === "other"
      ? "upi_other"
      : upiApp;
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!paymentMode || !monthId || submitting || submitted) return;

    if (paymentType === "upi" && !upiApp) {
      showToast("Please select which UPI app you used", "error");
      return;
    }

    if (paymentType !== "cash" && !screenshot && !skipScreenshot) {
      showToast("Please upload a payment screenshot", "error");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create payment record
      const paymentData = await apiSubmitPayment({
        monthId: parseInt(monthId),
        paymentMode,
        paymentDate,
      });

      // Step 2: Upload screenshot if UPI payment
      if (paymentType === "upi" && screenshot) {
        try {
          await apiUploadScreenshot(paymentData.id, screenshot);
        } catch {
          // Payment was created but screenshot failed
          showToast("Screenshot upload failed. You can retry from the dashboard.", "error");
          setTimeout(() => router.replace("/resident"), 2000);
          return;
        }
      }

      // Mark as submitted to prevent double-clicks
      setSubmitted(true);
      showToast("Payment submitted!", "success");
      router.replace("/resident");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error. Please try again.", "error");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}
      <NavBar title="Submit Payment" backHref="/resident" />
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Payment Type Selection */}
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            How did you pay?
          </h2>
          <div className="space-y-3">
            {[
              { value: "upi" as const, label: "UPI", icon: "💳", color: "bg-indigo-50 border-indigo-200" },
              { value: "cash" as const, label: "Cash to Security", icon: "💵", color: "bg-emerald-50 border-emerald-200" },
            ].map((type) => (
              <button
                key={type.value}
                onClick={() => { setPaymentType(type.value); if (type.value === "cash") { setUpiApp(""); setCustomUpiApp(""); } else { setUpiApp("gpay"); } }}
                disabled={submitting || submitted}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                  ${paymentType === type.value
                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                    : `${type.color} hover:shadow-sm`}
                  ${(submitting || submitted) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="text-2xl">{type.icon}</span>
                <span className="text-lg font-medium text-slate-800">
                  {type.label}
                </span>
                {paymentType === type.value && (
                  <span className="ml-auto text-indigo-600 font-bold text-xl">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* UPI App Sub-selection */}
          {paymentType === "upi" && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-2">Which app?</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "gpay", label: "GPay" },
                  { value: "phonepe", label: "PhonePe" },
                  { value: "other", label: "Other" },
                ].map((app) => (
                  <button
                    key={app.value}
                    onClick={() => setUpiApp(app.value)}
                    disabled={submitting || submitted}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all
                      ${upiApp === app.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                  >
                    {app.label}
                  </button>
                ))}
              </div>
              {upiApp === "other" && (
                <input
                  type="text"
                  value={customUpiApp}
                  onChange={(e) => setCustomUpiApp(e.target.value)}
                  placeholder="e.g. Paytm, BHIM, Bank app..."
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          )}
        </Card>

        {/* Payment Date */}
        {paymentType && (
          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-3">Payment Date</h2>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={submitting || submitted}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-400 mt-1">When was the payment actually made?</p>
          </Card>
        )}

        {/* Screenshot Upload (for UPI payments) */}
        {paymentType === "upi" && upiApp && !skipScreenshot && (
          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Upload Payment Screenshot
            </h2>
            <div
              onClick={() => !submitting && !submitted && fileInputRef.current?.click()}
              className={`border-2 border-dashed border-slate-300 rounded-xl p-6 text-center transition-all
                ${submitting || submitted ? "opacity-50" : "cursor-pointer hover:border-indigo-400 hover:bg-indigo-50"}`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Screenshot preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl">📷</div>
                  <p className="text-slate-600 font-medium">
                    Tap to take photo or select from gallery
                  </p>
                  <p className="text-slate-400 text-sm">
                    JPG, PNG up to 5MB
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </Card>
        )}

        {/* Submit without screenshot — subtle link below upload */}
        {paymentType === "upi" && upiApp && !skipScreenshot && (
          <div className="text-center">
            <button
              onClick={() => setSkipScreenshot(true)}
              disabled={submitting || submitted}
              className="text-xs text-slate-400 underline hover:text-slate-600 disabled:opacity-50"
            >
              Submit without screenshot
            </button>
          </div>
        )}

        {/* Cash Confirmation */}
        {paymentType === "cash" && (
          <Card>
            <div className="bg-amber-50 p-4 rounded-xl">
              <p className="text-amber-800 font-medium">
                After submitting, the security will need to confirm they received
                the cash from you in person.
              </p>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        {paymentMode && (paymentType === "cash" || upiApp) && (
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitted}
            size="lg"
            variant="success"
          >
            {submitted
              ? "Submitted!"
              : paymentType === "cash"
                ? "Report Cash Payment"
                : "Submit Payment"}
          </Button>
        )}
      </main>
    </div>
  );
}
