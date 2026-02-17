import { SPINNER } from "@/lib/theme";

const SIZES = {
  sm: "h-6 w-6 border-4",
  md: "h-8 w-8 border-4",
  lg: "h-10 w-10 border-[5px]",
};

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullPage?: boolean;
  className?: string;
}

export default function LoadingSpinner({ size = "md", fullPage, className = "" }: LoadingSpinnerProps) {
  const spinner = (
    <div className={`animate-spin ${SIZES[size]} ${SPINNER.color} border-t-transparent rounded-full ${className}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
