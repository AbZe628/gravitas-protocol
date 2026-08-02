import React from 'react';
import { Link } from 'wouter';
import GeometryBackground from '../components/GeometryBackground';
import { ArrowRight, Github } from 'lucide-react';

const Home: React.FC = () => {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden min-h-[80vh] flex items-center">
        <GeometryBackground />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl mb-8 text-balance">
              Compliance that can be <span className="text-gold">verified</span> rather than asserted.
            </h1>
            <p className="text-xl md:text-2xl text-muted mb-10 leading-relaxed">
              Gravitas Protocol is Shariah-compliance infrastructure for digital assets. It embeds rules approved by scholars directly into the execution layer of the Arbitrum network, ensuring every transaction satisfies compliance requirements before it can settle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/protocol" className="btn-gold-filled group">
                Explore the Protocol <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Link>
              <a
                href="https://github.com/abze628/gravitas-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold"
              >
                <Github className="mr-2" size={20} /> View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-24 border-t border-line bg-surface/30">
        <div className="container">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl mb-8">The Problem</h2>
            <div className="space-y-6 text-lg text-muted">
              <p>
                Today, a Shariah board approves an asset and that approval is recorded in a document. However, transactions then run through software that has never read that document.
              </p>
              <p>
                Verification currently happens afterwards through audit, performed on a small sample, often months later.
              </p>
              <p>
                On a public chain, nothing can be reversed. A compliance check performed after settlement has no remedy available to it; the breach is already permanent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Two Parts */}
      <section className="py-24 border-t border-line">
        <div className="container">
          <h2 className="text-3xl md:text-4xl mb-12 text-center">Protocol Architecture</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/protocol#registry" className="card group hover:border-gold transition-all duration-300">
              <h3 className="text-2xl mb-4 group-hover:text-gold transition-colors">Policy Registry</h3>
              <p className="text-muted mb-6">
                A public on-chain record of the assets and rules a Shariah board has approved. Every rule is recorded permanently with a timestamp.
              </p>
              <span className="text-gold inline-flex items-center">Learn more <ArrowRight size={16} className="ml-1" /></span>
            </Link>
            <Link href="/protocol#teleport" className="card group hover:border-gold transition-all duration-300">
              <h3 className="text-2xl mb-4 group-hover:text-gold transition-colors">TeleportV3</h3>
              <p className="text-muted mb-6">
                An execution engine that binds every economic parameter into a single signed authorisation and executes the whole operation atomically.
              </p>
              <span className="text-gold inline-flex items-center">Learn more <ArrowRight size={16} className="ml-1" /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* Status Strip */}
      <section className="py-16 bg-surface border-y border-line">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-12">
            <div>
              <div className="text-5xl font-display text-gold mb-2">66</div>
              <div className="text-sm uppercase tracking-widest text-muted">Foundry Tests Passing</div>
            </div>
            <div>
              <div className="text-5xl font-display text-gold mb-2">0</div>
              <div className="text-sm uppercase tracking-widest text-muted">Client Funds Ever Held</div>
            </div>
            <div>
              <div className="text-5xl font-display text-gold mb-2">2</div>
              <div className="text-sm uppercase tracking-widest text-muted">Contracts on Testnet</div>
            </div>
          </div>
          <div className="p-6 border border-gold/20 bg-gold/5 rounded-lg text-center max-w-2xl mx-auto">
            <p className="text-sm text-goldsoft">
              Deployed bytecode is 0.1.0 and predates the 0.1.2 hardening. Two security fixes are in the repository and not yet on chain.
            </p>
          </div>
        </div>
      </section>

      {/* Verification */}
      <section className="py-24 border-b border-line">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl mb-6">Independent Verification</h2>
            <p className="text-lg text-muted mb-10">
              Everything is public and can be checked without any cooperation from us. We provide the tools and transparency for institutional reviewers to verify every claim.
            </p>
            <a
              href="https://github.com/abze628/gravitas-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold"
            >
              <Github className="mr-2" size={20} /> Review the Source Code
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
