import React from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

/**
 * Komponen Label Teks Formulir PMB UPT
 */
export const Label: React.FC<LabelProps> = ({
  className = "",
  required,
  children,
  ...props
}) => {
  return (
    <label
      className={`block text-xs font-bold text-biru-900 uppercase tracking-wider mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && (
        <span className="text-biru-600 font-bold ml-1" title="Wajib diisi">
          *
        </span>
      )}
    </label>
  );
};
