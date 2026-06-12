import React from "react";

interface PriceInputProps {
  value: string;
  onChange: (value: string) => void;
  onApply?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
  disabled?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
}

/**
 * Shared numeric price input with:
 * - $ prefix positioned outside the input field
 * - Auto-select on focus (so first keystroke replaces the whole value)
 * - Numeric-only filtering
 * - Enter → onApply (or blur if not provided)
 * - Escape → onCancel (or blur if not provided)
 */
export function PriceInput({
  value,
  onChange,
  onApply,
  onCancel,
  autoFocus,
  placeholder = "0",
  disabled,
  wrapperClassName = "",
  inputClassName = "",
}: PriceInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onApply) {
        onApply();
      } else {
        (e.target as HTMLInputElement).blur();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (onCancel) {
        onCancel();
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  return (
    <div className={`relative ${wrapperClassName}`}>
      <span
        aria-hidden
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none select-none"
      >
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        onFocus={(e) => e.target.select()}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`pl-6 ${inputClassName}`}
      />
    </div>
  );
}
