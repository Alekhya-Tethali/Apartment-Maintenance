"use client";

import { useState, useRef, useEffect } from "react";
import { MONTH_NAMES } from "@/lib/constants";
import type { MonthData } from "@/lib/types";

interface MonthSelectorProps {
  months: MonthData[];
  selectedMonth: MonthData | null;
  onSelectMonth: (month: MonthData) => void;
}

export default function MonthSelector({
  months,
  selectedMonth,
  onSelectMonth,
}: MonthSelectorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownYear, setDropdownYear] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  if (months.length === 0 || !selectedMonth) return null;

  // Sort months chronologically (ascending) for navigation
  const sorted = [...months].sort((a, b) => a.year - b.year || a.month - b.month);
  const currentIndex = sorted.findIndex((m) => m.id === selectedMonth.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < sorted.length - 1;

  // Group by year for dropdown — years descending (recent first)
  const years = [...new Set(sorted.map((m) => m.year))].sort((a, b) => b - a);
  const activeYear = dropdownYear ?? selectedMonth.year;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-1 py-1">
        {/* Prev arrow */}
        <button
          onClick={() => hasPrev && onSelectMonth(sorted[currentIndex - 1])}
          disabled={!hasPrev}
          className={`p-2 rounded-lg transition-colors ${
            hasPrev ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center — month name, clickable for dropdown */}
        <button
          onClick={() => { setDropdownYear(selectedMonth.year); setDropdownOpen(!dropdownOpen); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <span className="font-semibold text-slate-800">
            {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
          </span>
          {selectedMonth.status === "closed" && (
            <span className="text-xs text-emerald-600">(Closed)</span>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Next arrow */}
        <button
          onClick={() => hasNext && onSelectMonth(sorted[currentIndex + 1])}
          disabled={!hasNext}
          className={`p-2 rounded-lg transition-colors ${
            hasNext ? "hover:bg-slate-100 text-slate-700" : "text-slate-300 cursor-not-allowed"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Year tabs — only when multiple years */}
          {years.length > 1 && (
            <div className="flex border-b border-slate-100 px-2 pt-2 pb-1 gap-1 overflow-x-auto">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setDropdownYear(y)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
                    ${activeYear === y
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}

          <div className="p-2">
            <div className="grid grid-cols-4 gap-1">
              {sorted
                .filter((m) => m.year === activeYear)
                .sort((a, b) => a.month - b.month)
                .map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { onSelectMonth(m); setDropdownOpen(false); }}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all
                      ${selectedMonth.id === m.id
                        ? "bg-indigo-600 text-white"
                        : m.status === "closed"
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-white text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                  >
                    {MONTH_NAMES[m.month - 1]}
                    {m.status === "closed" && " ✓"}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
