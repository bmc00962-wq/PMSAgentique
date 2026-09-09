interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizes = {
  xs: "w-3 h-3 border",
  sm: "w-4 h-4 border",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-2",
};

const LoadingSpinner = ({ size = "md", label, className = "" }: LoadingSpinnerProps) => (
  <div className={`flex flex-col items-center justify-center gap-2 ${className}`} role="status" aria-label={label ?? "Chargement"}>
    <div className={`${sizes[size]} border-primary/20 border-t-primary rounded-full animate-spin`} />
    {label && <p className="text-xs text-muted-foreground">{label}</p>}
  </div>
);

export default LoadingSpinner;
