import React from 'react';

const Status: React.FC = () => {
  const statusItems = [
    { label: "Network", value: "Arbitrum Sepolia testnet. Not mainnet." },
    { label: "Client funds", value: "None have ever passed through the protocol." },
    { label: "Tests", value: "66 Foundry tests passing." },
    { label: "Independent security audit", value: "Not carried out. Funded by a round that has not closed, and precedes any production deployment.", highlight: true },
    { label: "Shariah board", value: "In place through AmanX Advisory." },
    { label: "Shariah certification", value: "In progress. Not complete.", highlight: true },
    { label: "Letters of intent", value: "Four signed institutional letters of intent. These are statements of interest, not contracts, not customers, not partnerships." },
    { label: "Incorporation", value: "In progress, Istanbul Financial Centre." }
  ];

  return (
    <div className="py-24">
      <div className="container">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl mb-12">Current Status</h1>
          
          <div className="space-y-12">
            <section>
              <div className="overflow-hidden border border-line rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-line">
                      <th className="px-6 py-4 text-sm font-medium text-muted uppercase tracking-widest w-1/3">Component</th>
                      <th className="px-6 py-4 text-sm font-medium text-muted uppercase tracking-widest">Current State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {statusItems.map((item, i) => (
                      <tr key={i} className="hover:bg-surface/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-paper">{item.label}</td>
                        <td className={`px-6 py-4 text-muted ${item.highlight ? 'text-goldsoft' : ''}`}>
                          {item.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="pt-12 border-t border-line">
              <div className="max-w-2xl">
                <p className="text-xl text-muted leading-relaxed">
                  We state these facts precisely, including everything not yet done. A system whose whole proposition is that compliance can be verified rather than asserted cannot be introduced by a company that asserts things about itself.
                </p>
                <p className="text-xl text-muted mt-6 leading-relaxed">
                  Transparency is not a feature of the protocol; it is the foundation of the company.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Status;
