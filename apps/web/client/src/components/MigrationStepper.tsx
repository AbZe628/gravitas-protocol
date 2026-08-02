import { CheckCircle, AlertCircle, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

export type StepStatus = "pending" | "active" | "completed" | "error";

interface Step {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: StepStatus;
}

interface MigrationStepperProps {
  steps: Step[];
  currentStep: number;
}

export function MigrationStepper({ steps, currentStep }: MigrationStepperProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.status === "completed";
        const isError = step.status === "error";

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`border-2 transition-all ${
                isError
                  ? "border-red-500/30 bg-red-500/5"
                  : isCompleted
                    ? "border-green-500/30 bg-green-500/5"
                    : isActive
                      ? "border-[#D4AF37]/50 bg-[#D4AF37]/8"
                      : "border-[#D4AF37]/10 bg-[#0A1628]/40"
              }`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isError
                        ? "bg-red-500/20 text-red-400"
                        : isCompleted
                          ? "bg-green-500/20 text-green-400"
                          : isActive
                            ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                            : "bg-[#D4AF37]/10 text-[#D4AF37]/60"
                    }`}
                  >
                    {isError ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isActive ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                        <Zap className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold text-sm md:text-base ${
                        isError
                          ? "text-red-400"
                          : isCompleted
                            ? "text-green-400"
                            : isActive
                              ? "text-[#D4AF37]"
                              : "text-white/70"
                      }`}>
                        {step.label}
                      </h4>
                      {isCompleted && <span className="text-[10px] font-mono text-green-400">✓ Done</span>}
                      {isActive && <span className="text-[10px] font-mono text-[#D4AF37] animate-pulse">● Active</span>}
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {index < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <div
                  className={`w-0.5 h-6 transition-colors ${
                    isCompleted ? "bg-green-500/40" : "bg-[#D4AF37]/20"
                  }`}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
