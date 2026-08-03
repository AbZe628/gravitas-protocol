import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft, AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import GeometryBackground from "@/components/GeometryBackground";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-ink text-paper flex items-center justify-center p-6 relative overflow-hidden selection:bg-gold/30 selection:text-goldsoft">
      <GeometryBackground variant="simple" className="opacity-20 scale-150" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full text-center relative z-10"
      >
        <div className="h-24 w-24 rounded-3xl bg-gold/5 border border-gold/20 flex items-center justify-center mx-auto mb-10 shadow-2xl">
          <AlertCircle className="h-12 w-12 text-gold opacity-40" />
        </div>
        
        <h1 className="text-6xl font-display font-bold text-paper mb-6">404</h1>
        <h2 className="text-2xl font-display font-bold text-paper mb-4">Intent Not Found</h2>
        <p className="text-muted mb-12 leading-relaxed">
          The requested protocol endpoint does not exist or has been moved to a different coordinate within the Gravitas Protocol infrastructure.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="flex-1 bg-gold text-ink hover:bg-goldsoft h-14 rounded-sm font-bold text-lg shadow-xl shadow-gold/10 transition-all"
          >
            <Home className="mr-3 h-5 w-5" /> Return Home
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex-1 border-line text-muted hover:text-paper h-14 rounded-sm font-bold text-lg transition-all"
          >
            <ArrowLeft className="mr-3 h-5 w-5" /> Previous Node
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
