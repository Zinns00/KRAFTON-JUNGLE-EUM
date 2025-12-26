import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "danger" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-600/50",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50",
  secondary:
    "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
