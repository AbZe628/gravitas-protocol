import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import ParametricField from "@/design/ParametricField";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--g-navy)] px-4 relative overflow-hidden">
      <ParametricField 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20" 
        anchor={{ x: 0.5, y: 0.5 }}
        scale={0.6}
        shells={3}
      />
      
      <div className="text-center max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="h-20 w-20 rounded-2xl bg-[var(--g-surface)] border border-[var(--g-line)] flex items-center justify-center shadow-2xl">
            <AlertCircle className="h-10 w-10 text-[var(--g-gold)]" />
          </div>
        </div>
        <h1 className="g-display text-6xl mb-2 text-[var(--g-gold)]">404</h1>
        <h2 className="text-xl font-bold text-[var(--g-paper)] mb-4">Intent Not Found</h2>
        <p className="text-[var(--g-text-sm)] text-[var(--g-muted)] mb-10 leading-relaxed">
          The requested protocol endpoint does not exist or has been moved to a different coordinate.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="bg-[var(--g-gold)] text-[var(--g-navy)] hover:bg-[var(--g-gold-soft)] font-bold gap-2 px-6"
          >
            <Home className="h-4 w-4" />
            Return Home
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="border-[var(--g-line)] text-[var(--g-paper)] hover:bg-[var(--g-surface)] gap-2 px-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous Node
          </Button>
        </div>
      </div>
    </div>
  );
}
