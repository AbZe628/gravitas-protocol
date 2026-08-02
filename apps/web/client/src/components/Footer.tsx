import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-ink border-t border-line py-12 mt-auto">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-8">
            <a
              href="https://github.com/abze628/gravitas-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-paper transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/abze628/gravitas-protocol/tree/main/integration-kit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-paper transition-colors"
            >
              Integration Kit
            </a>
          </div>
          <div className="text-muted text-sm text-center md:text-right">
            The protocol is currently on testnet and holds no client funds.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
