import type { LucideProps } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
    {Icon && (
      <div className="w-12 h-12 bg-secondary border border-border rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-muted-foreground/50" />
      </div>
    )}
    <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
