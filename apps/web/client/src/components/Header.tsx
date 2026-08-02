import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { label: 'Governance', href: '/governance' },
    { label: 'Status', href: '/status' },
    { label: 'Developers', href: '/developers' },
  ];

  const protocolDropdown = [
    {
      label: 'Policy Registry',
      description: 'Rules approved by scholars, recorded on chain',
      href: '/protocol#registry',
    },
    {
      label: 'Atomic settlement',
      description: 'One signed intent, or nothing happens',
      href: '/protocol#teleport',
    },
  ];

  const MajlisButton = ({ className = "" }) => (
    <a
      href="https://majlis.gravitasprotocol.xyz"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-6 py-2 border border-gold text-gold hover:bg-gold/10 transition-colors duration-200 rounded-sm font-medium ${className}`}
    >
      Majlis
    </a>
  );

  return (
    <header className="sticky top-0 z-50 bg-ink/80 backdrop-blur-md border-b border-line">
      <div className="container flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-gold rounded-full flex items-center justify-center text-ink font-bold text-xl">G</div>
          <span className="text-xl font-display tracking-tight text-paper group-hover:text-gold transition-colors">
            Gravitas Protocol
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          <div className="relative group">
            <button
              className={`flex items-center gap-1 nav-link ${location.startsWith('/protocol') ? 'text-paper' : 'text-muted'}`}
              onMouseEnter={() => setIsDropdownOpen(true)}
              onMouseLeave={() => setIsDropdownOpen(false)}
            >
              Protocol <ChevronDown size={16} />
            </button>
            {isDropdownOpen && (
              <div
                className="absolute top-full left-0 w-80 bg-surface border border-line rounded-lg mt-2 p-2 shadow-2xl"
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                {protocolDropdown.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block p-3 hover:bg-ink rounded-md transition-colors group"
                  >
                    <div className="font-medium text-paper group-hover:text-gold">{item.label}</div>
                    <div className="text-xs text-muted mt-1">{item.description}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${location === item.href ? 'text-paper' : 'text-muted'}`}
            >
              {item.label}
            </Link>
          ))}

          <MajlisButton />
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="lg:hidden text-paper p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 top-20 bg-ink z-40 lg:hidden overflow-y-auto p-6">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="text-muted text-xs uppercase tracking-widest">Protocol</div>
              {protocolDropdown.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block"
                >
                  <div className="text-xl text-paper">{item.label}</div>
                  <div className="text-sm text-muted">{item.description}</div>
                </Link>
              ))}
            </div>

            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-xl text-paper"
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-4 border-t border-line">
              <MajlisButton className="w-full justify-center text-xl py-4" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
