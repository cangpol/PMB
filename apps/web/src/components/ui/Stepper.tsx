import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: string | number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
  onStepClick?: (stepIndex: number) => void;
}

/**
 * Komponen Tahapan Proses (Stepper) PMB UPT
 * Responsif horizontal pada tablet/desktop dan vertikal pada layar mobile kecil.
 */
export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = "horizontal",
  className = "",
  onStepClick,
}) => {
  return (
    <nav
      aria-label="Progres Alur Pendaftaran"
      className={`w-full ${
        orientation === "horizontal"
          ? "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-2"
          : "flex flex-col space-y-4"
      } ${className}`}
    >
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;

        return (
          <React.Fragment key={step.id}>
            <div
              onClick={() => onStepClick?.(idx)}
              className={`flex items-center gap-3 ${
                onStepClick ? "cursor-pointer" : ""
              } group`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shrink-0 ${
                  isCompleted
                    ? "bg-biru-700 text-putih shadow-soft-sm"
                    : isCurrent
                      ? "border-2 border-biru-700 bg-putih text-biru-700 shadow-soft-sm"
                      : "border border-biru-200 bg-biru-50/50 text-biru-800"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="text-left">
                <span
                  className={`text-xs font-semibold block transition-colors ${
                    isCurrent || isCompleted ? "text-biru-950" : "text-biru-800"
                  }`}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="text-[11px] text-biru-700 font-light block">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {orientation === "horizontal" && idx < steps.length - 1 && (
              <div
                className={`hidden md:block flex-1 h-0.5 mx-2 rounded transition-colors ${
                  idx < currentStep ? "bg-biru-700" : "bg-biru-100"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
