import React from 'react';
import { Github, ExternalLink, Code2, Terminal, Book } from 'lucide-react';

const Developers: React.FC = () => {
  return (
    <div className="py-24">
      <div className="container">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl mb-12">Developers</h1>
          
          <div className="space-y-16">
            <section>
              <h2 className="text-3xl mb-8">Contract Addresses</h2>
              <div className="grid gap-6">
                <div className="card">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-paper">GravitasPolicyRegistry</span>
                    <span className="text-xs text-muted uppercase tracking-widest">Arbitrum Sepolia</span>
                  </div>
                  <code className="block bg-ink p-3 rounded border border-line text-goldsoft text-sm overflow-x-auto g-mono mb-2">
                    0xbcaE3069362B0f0b80f44139052f159456C84679
                  </code>
                  <a href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679" target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-gold flex items-center gap-1">
                    View on Arbiscan <ExternalLink size={12} />
                  </a>
                </div>
                
                <div className="card">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-paper">TeleportV3</span>
                    <span className="text-xs text-muted uppercase tracking-widest">Arbitrum Sepolia</span>
                  </div>
                  <code className="block bg-ink p-3 rounded border border-line text-goldsoft text-sm overflow-x-auto g-mono mb-2">
                    0x5D423f8d01539B92D3f3953b91682D9884D1E993
                  </code>
                  <a href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993" target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-gold flex items-center gap-1">
                    View on Arbiscan <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <div className="mt-8 p-6 border border-gold/20 bg-gold/5 rounded-lg">
                <h4 className="text-goldsoft font-medium mb-2">Deployment Notice</h4>
                <p className="text-sm text-muted leading-relaxed">
                  Deployed bytecode is 0.1.0 and predates the 0.1.2 hardening. Two security fixes are in the repository and not yet on chain. Anyone reading the verified source on Arbiscan is reading pre-hardening code.
                </p>
              </div>
            </section>

            <section className="pt-16 border-t border-line">
              <h2 className="text-3xl mb-8">Technical Verification</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-lg text-muted mb-6 leading-relaxed">
                    A technical reviewer needs no cooperation from us to verify any claim on this site. All protocol logic is open source and verifiable on-chain.
                  </p>
                  <div className="flex items-center gap-3 text-gold mb-4">
                    <Terminal size={20} />
                    <span className="font-medium">66 Foundry tests passing</span>
                  </div>
                  <div className="flex items-center gap-3 text-gold">
                    <Code2 size={20} />
                    <span className="font-medium">TypeScript SDK available</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <a
                    href="https://github.com/abze628/gravitas-protocol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-surface border border-line rounded-lg hover:border-gold transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Github className="text-muted group-hover:text-gold" size={24} />
                      <span className="font-medium">Protocol Repository</span>
                    </div>
                    <ArrowRight size={16} className="text-muted group-hover:text-gold" />
                  </a>
                  
                  <a
                    href="https://github.com/abze628/gravitas-protocol/tree/main/integration-kit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-surface border border-line rounded-lg hover:border-gold transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Book className="text-muted group-hover:text-gold" size={24} />
                      <span className="font-medium">Integration Kit</span>
                    </div>
                    <ArrowRight size={16} className="text-muted group-hover:text-gold" />
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Developers;
