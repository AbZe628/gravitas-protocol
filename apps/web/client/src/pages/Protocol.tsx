import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Github, ExternalLink } from 'lucide-react';

const Protocol: React.FC = () => {
  const [location] = useLocation();

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [location]);

  return (
    <div className="py-24">
      <div className="container">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl mb-12">Protocol Architecture</h1>
          
          <div className="space-y-24">
            {/* Policy Registry */}
            <section id="registry" className="scroll-mt-32">
              <h2 className="text-3xl md:text-4xl mb-8 text-gold">Policy Registry</h2>
              <div className="space-y-6 text-lg text-muted">
                <p>
                  The Policy Registry is a public on-chain record of the assets and rules a Shariah board has approved. It serves as the single source of truth for compliance across the protocol.
                </p>
                <p>
                  Every rule, every version, and every amendment is recorded permanently with a timestamp. This permanent versioning ensures that the compliance state at any point in history can be audited and verified.
                </p>
                <p>
                  Before any transaction executes, the protocol checks the transaction parameters against this record. If a condition is not met, the transaction does not proceed. It is not flagged for later review; it simply does not happen.
                </p>
              </div>
            </section>

            {/* TeleportV3 */}
            <section id="teleport" className="scroll-mt-32">
              <h2 className="text-3xl md:text-4xl mb-8 text-gold">TeleportV3 & Atomic Settlement</h2>
              <div className="space-y-6 text-lg text-muted">
                <p>
                  In traditional DeFi, some operations cannot be done in a single step. Moving a liquidity position, for example, might take four to six separate transactions: withdrawing liquidity, collecting fees, swapping to rebalance, approving new tokens, and finally minting the new position.
                </p>
                <p>
                  Between each step, the price moves and third parties can position themselves ahead of you. The party committing does not know, at the outset, what they will end up holding. In fiqh, this is <span className="text-goldsoft italic">gharar</span> — uncertainty about the substance and outcome of a contract at the moment of contracting.
                </p>
                <p>
                  TeleportV3 solves this by binding every economic parameter into a single signed authorisation (EIP-712). The protocol then executes the entire multi-step operation atomically: either exactly as signed, or nothing happens at all. This removes execution risk and ensures compliance with the prohibition of gharar.
                </p>
              </div>
            </section>

            {/* Deployed Contracts */}
            <section className="pt-12 border-t border-line">
              <h2 className="text-2xl mb-8">Deployed Contracts</h2>
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

            {/* Integration */}
            <section className="pt-12 border-t border-line">
              <h2 className="text-3xl md:text-4xl mb-8">Integration</h2>
              <p className="text-lg text-muted mb-8">
                Developers can integrate with Gravitas Protocol using our official integration kit, which contains everything needed to interact with the Policy Registry and TeleportV3.
              </p>
              <a
                href="https://github.com/abze628/gravitas-protocol/tree/main/integration-kit"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold"
              >
                <Github className="mr-2" size={20} /> Integration Kit
              </a>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protocol;
