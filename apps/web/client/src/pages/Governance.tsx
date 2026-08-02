import React from 'react';
import { Shield, Clock, Key, CheckCircle2, AlertCircle } from 'lucide-react';

const Governance: React.FC = () => {
  const constraints = [
    "It does not decide what is permissible. Every rule it enforces originates with scholars.",
    "It does not replace a Shariah board, an auditor, a regulator or counsel.",
    "It never takes custody of funds or keys.",
    "It cannot make an impermissible instrument permissible."
  ];

  return (
    <div className="py-24">
      <div className="container">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-6xl mb-12">Governance</h1>
          
          <div className="space-y-16">
            <section>
              <p className="text-xl text-muted mb-12 leading-relaxed">
                The Gravitas Protocol is governed by a framework designed to ensure that technical execution remains strictly aligned with Shariah principles, with multiple layers of institutional-grade security.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="card">
                  <Shield className="text-gold mb-4" size={32} />
                  <h3 className="text-xl mb-3">3 of 5 Multisig</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    Changing any rule in the Policy Registry requires 3 of 5 signatures from the authorized multisig. This prevents any single party from unilaterally altering the compliance rules.
                  </p>
                </div>

                <div className="card">
                  <Clock className="text-gold mb-4" size={32} />
                  <h3 className="text-xl mb-3">48-Hour Timelock</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    Once an approved change is signed, it sits in a 48-hour timelock. The change is publicly visible during this period, allowing any improper modification to be seen and contested before it takes effect.
                  </p>
                </div>

                <div className="card">
                  <Key className="text-gold mb-4" size={32} />
                  <h3 className="text-xl mb-3">Two-Step Ownership</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    Ownership of the protocol contracts transfers in two steps, requiring the receiving party to explicitly accept the transfer. This eliminates the risk of accidental loss of control.
                  </p>
                </div>

                <div className="card">
                  <CheckCircle2 className="text-gold mb-4" size={32} />
                  <h3 className="text-xl mb-3">Scholar Sovereignty</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    Signing keys can be held by the Shariah board members themselves, ensuring that the ultimate authority over what is permissible remains with the scholars.
                  </p>
                </div>
              </div>
            </section>

            <section className="pt-16 border-t border-line">
              <h2 className="text-3xl md:text-4xl mb-8">Scope of the Protocol</h2>
              <p className="text-lg text-muted mb-8">
                To maintain the integrity of the system, it is important to state clearly what the protocol does not do. These constraints are a strength, ensuring that human judgment remains central to the compliance process.
              </p>
              
              <div className="space-y-4">
                {constraints.map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-surface/50 border border-line rounded-lg">
                    <AlertCircle className="text-gold shrink-0" size={24} />
                    <p className="text-paper">{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Governance;
