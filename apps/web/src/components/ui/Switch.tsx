import React from "react";

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

/**
 * Komponen Sakelar Geser (Toggle Switch) Aksesibel PMB UPT
 */
export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className = "",
}) => {
  const switchId =
    id ||
    (label
      ? `switch-${String(label).toLowerCase().replace(/\s+/g, "-")}`
      : undefined);

  return (
    <div className={`inline-flex items-start gap-3 select-none ${className}`}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-biru-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-biru-700" : "bg-biru-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-putih shadow-soft-sm transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {(label || description) && (
        <label
          htmlFor={switchId}
          onClick={() => !disabled && onChange(!checked)}
          className={`space-y-0.5 text-left ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          {label && (
            <span className="text-sm font-medium text-biru-950 block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-biru-700 block">{description}</span>
          )}
        </label>
      )}
    </div>
  );
};
