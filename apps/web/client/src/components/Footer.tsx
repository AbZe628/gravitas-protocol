import { Link } from "wouter";
import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-ink border-t border-line py-24 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-20">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-8 rounded-lg bg-gold flex items-center justify-center">
                <span className="text-ink font-black text-sm">G</span>
              </div>
              <span className="font-display text-xl font-bold text-paper">Gravitas Protocol</span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Institutional-grade Shariah compliance infrastructure for the decentralized economy. Built for Arbitrum.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-gold mb-8">Protocol</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="/#architecture" className="text-muted hover:text-paper transition-colors">Architecture</a></li>
                <li><Link href="/compliance" className="text-muted hover:text-paper transition-colors">Compliance</Link></li>
                <li><a href="/#security" className="text-muted hover:text-paper transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-gold mb-8">Developers</h4>
              <ul className="space-y-4 text-sm">
                <li><Link href="/docs" className="text-muted hover:text-paper transition-colors">Documentation</Link></li>
                <li><Link href="/sdk" className="text-muted hover:text-paper transition-colors">SDK</Link></li>
                <li><a href="https://github.com/AbZe628/gravitas-protocol" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-paper transition-colors">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-gold mb-8">Social</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="text-muted hover:text-paper transition-colors">Twitter / X</a></li>
                <li><a href="#" className="text-muted hover:text-paper transition-colors">LinkedIn</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-8 pt-12 border-t border-line">
          <div className="text-xs text-muted">
            © 2026 Gravitas Protocol. Built for institutional Shariah compliance.
          </div>
          <div className="flex gap-8">
            <a 
              href="https://github.com/AbZe628/gravitas-protocol" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted hover:text-paper transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
