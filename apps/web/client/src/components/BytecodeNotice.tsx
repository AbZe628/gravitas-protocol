import React from 'react';
import { ShieldAlert } from 'lucide-react';

const BytecodeNotice: React.FC = () => {
  return (
    <div className="p-6 border border-gold/20 bg-gold/5 rounded-lg flex gap-4 items-start max-w-2xl">
      <ShieldAlert className="text-gold shrink-0 mt-1" size={20} />
      <p className="text-sm text-goldsoft leading-relaxed">
        Deployed bytecode is 0.1.0 and predates the 0.1.2 hardening. Two security fixes are in the repository and not yet on chain.
      </p>
    </div>
  );
};

export default BytecodeNotice;
