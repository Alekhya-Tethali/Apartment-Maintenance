"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ScreenshotLightboxProps {
  url: string;
  onClose: () => void;
}

export default function ScreenshotLightbox({ url, onClose }: ScreenshotLightboxProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        )}
        {error ? (
          <div className="text-center py-8">
            <p className="text-rose-500 text-sm">Failed to load screenshot</p>
          </div>
        ) : (
          <img
            src={url}
            alt="Payment screenshot"
            className={`w-full rounded-xl ${loading ? "hidden" : ""}`}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
        <Button onClick={onClose} variant="outline" size="sm" className="mt-2">
          Close
        </Button>
      </div>
    </div>
  );
}
