"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";

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

  const [paymentMode, setPaymentMode] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [skipScreenshot, setSkipScreenshot] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
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

    if (paymentMode !== "cash" && !screenshot && !skipScreenshot) {
      setToast({ message: "Please upload a payment screenshot", type: "error" });
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create payment record
      const paymentRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthId: parseInt(monthId),
          paymentMode,
          paymentDate,
        }),
      });

      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        setToast({ message: paymentData.error || "Failed to submit", type: "error" });
        setSubmitting(false);
        return;
      }

      // Step 2: Upload screenshot if digital payment
      if (paymentMode !== "cash" && screenshot) {
        const formData = new FormData();
        formData.append("screenshot", screenshot);
        formData.append("paymentId", paymentData.id.toString());

        const uploadRes = await fetch("/api/payments/upload-screenshot", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          // Payment was created but screenshot failed
          // Redirect to dashboard which will show retry option
          setToast({ message: "Screenshot upload failed. You can retry from the dashboard.", type: "error" });
          setTimeout(() => router.replace("/resident"), 2000);
          return;
        }
      }

      // Mark as submitted to prevent double-clicks
      setSubmitted(true);
      setToast({ message: "Payment submitted!", type: "success" });
      // Redirect to dashboard immediately
      router.replace("/resident");
    } catch {
      setToast({ message: "Network error. Please try again.", type: "error" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <NavBar title="Submit Payment" backHref="/resident" />
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Payment Mode Selection */}
        <Card>
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            How did you pay?
          </h2>
          <div className="space-y-3">
            {[
              { value: "gpay", label: "GPay", icon: "💳", color: "bg-indigo-50 border-indigo-200" },
              { value: "phonepe", label: "PhonePe", icon: "📱", color: "bg-violet-50 border-violet-200" },
              { value: "cash", label: "Cash to Security", icon: "💵", color: "bg-emerald-50 border-emerald-200" },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setPaymentMode(mode.value)}
                disabled={submitting || submitted}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                  ${paymentMode === mode.value
                    ? "border-indigo-500 bg-indigo-50 shadow-sm"
                    : `${mode.color} hover:shadow-sm`}
                  ${(submitting || submitted) ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="text-2xl">{mode.icon}</span>
                <span className="text-lg font-medium text-slate-800">
                  {mode.label}
                </span>
                {paymentMode === mode.value && (
                  <span className="ml-auto text-indigo-600 font-bold text-xl">✓</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Payment Date */}
        {paymentMode && (
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

        {/* Screenshot Upload (for digital payments) */}
        {paymentMode && paymentMode !== "cash" && !skipScreenshot && (
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
        {paymentMode && paymentMode !== "cash" && !skipScreenshot && (
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
        {paymentMode === "cash" && (
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
        {paymentMode && (
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={submitted}
            size="lg"
            variant="success"
          >
            {submitted
              ? "Submitted!"
              : paymentMode === "cash"
                ? "Report Cash Payment"
                : "Submit Payment"}
          </Button>
        )}
      </main>
    </div>
  );
}
