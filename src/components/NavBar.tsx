"use client";

import { useRouter } from "next/navigation";

interface NavBarProps {
  title: string;
  subtitle?: string;
  showLogout?: boolean;
  backHref?: string;
}

export default function NavBar({
  title,
  subtitle,
  showLogout = true,
  backHref,
}: NavBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  return (
    <header className="bg-blue-700 text-white px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {backHref && (
            <button
              onClick={() => router.push(backHref)}
              className="p-1 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            {subtitle && (
              <p className="text-blue-200 text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {showLogout && (
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
