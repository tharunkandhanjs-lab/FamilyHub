import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const variantMap = {
  primary: "default",
  secondary: "outline",
} as const;

interface FormButtonProps {
  type?: "submit" | "button";
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function FormButton({
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  children,
  onClick,
  className,
}: FormButtonProps) {
  return (
    <Button
      type={type}
      variant={variantMap[variant]}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
