"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PinInput from "@/components/ui/PinInput";
import Toast from "@/components/ui/Toast";

type LoginMode = "resident" | "security" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("resident");
  const [flatNumber, setFlatNumber] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flatDropdownOpen, setFlatDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const flats = useMemo(() => [
    "101", "102", "103",
    "201", "202", "203",
    "301", "302", "303",
    "401", "402", "403",
  ], []);

  // Use ref so the auto-login callback always has fresh values
  const stateRef = useRef({ mode, flatNumber, loading });
  useEffect(() => {
    stateRef.current = { mode, flatNumber, loading };
  }, [mode, flatNumber, loading]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFlatDropdownOpen(false);
      }
    }
    if (flatDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [flatDropdownOpen]);

  const doLogin = useCallback(async (pinOrPassword: string) => {
    const { mode: currentMode, flatNumber: currentFlat, loading: isLoading } = stateRef.current;
    if (isLoading) return;

    setLoading(true);
    setError("");

    try {
      const body: Record<string, string> = { role: currentMode };
      if (currentMode === "resident") {
        if (!currentFlat) {
          setError("Please select your flat first");
          setLoading(false);
          return;
        }
        body.flatNumber = currentFlat;
        body.pin = pinOrPassword;
      } else if (currentMode === "security") {
        body.pin = pinOrPassword;
      } else {
        body.password = pinOrPassword;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      if (currentMode === "resident") router.push("/resident");
      else if (currentMode === "security") router.push("/security");
      else router.push("/admin");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }, [router]);

  const handlePinComplete = useCallback((completedPin: string) => {
    setPin(completedPin);
    doLogin(completedPin);
  }, [doLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-indigo-800 flex items-center justify-center p-4">
      {error && (
        <Toast message={error} type="error" onClose={() => setError("")} />
      )}

      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            Laurel Residency
          </h1>
          <p className="text-slate-500 text-sm mt-1">Maintenance Tracker</p>
        </div>

        {/* Role Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          {(["resident", "security", "admin"] as LoginMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setPin(""); setPassword(""); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                ${mode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Resident Login */}
        {mode === "resident" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Your Flat
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setFlatDropdownOpen(!flatDropdownOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left
                    ${flatNumber
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-300 bg-white"
                    } ${flatDropdownOpen ? "ring-2 ring-indigo-200" : ""}`}
                >
                  <span className={`text-lg font-semibold ${flatNumber ? "text-indigo-700" : "text-slate-400"}`}>
                    {flatNumber ? `Flat ${flatNumber}` : "Select your flat"}
                  </span>
                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${flatDropdownOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {flatDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {flats.map((f) => (
                        <button
                          key={f}
                          onClick={() => { setFlatNumber(f); setFlatDropdownOpen(false); }}
                          className={`py-2.5 rounded-lg text-sm font-semibold transition-all
                            ${flatNumber === f
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
                Enter PIN
              </label>
              <PinInput onComplete={handlePinComplete} disabled={loading} />
            </div>
            {loading && (
              <div className="text-center text-sm text-indigo-600 font-medium">
                Logging in...
              </div>
            )}
          </div>
        )}

        {/* Security Login */}
        {mode === "security" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
                Enter Security PIN
              </label>
              <PinInput onComplete={handlePinComplete} disabled={loading} />
            </div>
            {loading && (
              <div className="text-center text-sm text-indigo-600 font-medium">
                Logging in...
              </div>
            )}
          </div>
        )}

        {/* Admin Login */}
        {mode === "admin" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin(password)}
                placeholder="Enter password"
                disabled={loading}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-lg
                  focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none
                  disabled:bg-slate-100"
              />
            </div>
            <Button onClick={() => doLogin(password)} loading={loading} size="lg">
              Login as Admin
            </Button>
          </div>
        )}

        {/* Forgot PIN */}
        {mode === "resident" && (
          <div className="mt-4 text-center">
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || ""}?text=${encodeURIComponent("Hi, I forgot my apartment maintenance portal PIN. My flat number is: ")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              Forgot PIN? Contact Admin
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
