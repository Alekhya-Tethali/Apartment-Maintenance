"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

export default function SubmitPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <SubmitPayment />
    </Suspense>
  );
}

function SubmitPayment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthId = searchParams.get("monthId");

  const [paymentMode, setPaymentMode] = useState<string>("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
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
    if (!paymentMode || !monthId) return;

    if (paymentMode !== "cash" && !screenshot) {
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
          setToast({ message: "Payment created but screenshot upload failed. Contact admin.", type: "error" });
          setSubmitting(false);
          return;
        }
      }

      setToast({ message: "Payment submitted successfully!", type: "success" });
      setTimeout(() => router.push("/resident"), 1500);
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
              { value: "gpay", label: "GPay", icon: "💳", color: "bg-blue-50 border-blue-200" },
              { value: "phonepe", label: "PhonePe", icon: "📱", color: "bg-purple-50 border-purple-200" },
              { value: "cash", label: "Cash to Security", icon: "💵", color: "bg-green-50 border-green-200" },
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setPaymentMode(mode.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                  ${paymentMode === mode.value
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : `${mode.color} hover:shadow-sm`}`}
              >
                <span className="text-2xl">{mode.icon}</span>
                <span className="text-lg font-medium text-slate-800">
                  {mode.label}
                </span>
                {paymentMode === mode.value && (
                  <span className="ml-auto text-blue-600 font-bold text-xl">✓</span>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Screenshot Upload (for digital payments) */}
        {paymentMode && paymentMode !== "cash" && (
          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Upload Payment Screenshot
            </h2>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
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
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </Card>
        )}

        {/* Cash Confirmation */}
        {paymentMode === "cash" && (
          <Card>
            <div className="bg-yellow-50 p-4 rounded-xl">
              <p className="text-yellow-800 font-medium">
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
            size="lg"
            variant="success"
          >
            {paymentMode === "cash"
              ? "Report Cash Payment"
              : "Submit Payment"}
          </Button>
        )}
      </main>
    </div>
  );
}
