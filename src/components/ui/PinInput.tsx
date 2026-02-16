"use client";

import { useRef, useState } from "react";

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
}

export default function PinInput({
  length = 4,
  onComplete,
  disabled = false,
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    if (newValues.every((v) => v !== "")) {
      onComplete(newValues.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted.length === length) {
      const newValues = pasted.split("");
      setValues(newValues);
      onComplete(pasted);
      inputs.current[length - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputs.current[index] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-14 h-16 text-center text-2xl font-bold
            border-2 border-slate-300 rounded-xl
            focus:border-blue-500 focus:ring-2 focus:ring-blue-200
            outline-none transition-all
            disabled:bg-slate-100 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
