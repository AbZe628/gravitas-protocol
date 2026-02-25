import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#060E1A] px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-[#D4AF37]" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-[#D4AF37] mb-3">404</h1>
        <h2 className="text-xl font-semibold text-white mb-3">Page Not Found</h2>
        <p className="text-white/50 mb-8 leading-relaxed text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="bg-[#D4AF37] text-[#060E1A] hover:bg-[#D4AF37]/90 font-semibold gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="border-white/15 text-white hover:bg-white/5 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
