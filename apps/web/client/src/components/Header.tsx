import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const protocolItems = [
  {
    title: "Architecture",
    href: "/#architecture",
    description: "Atomic migration infrastructure and on-chain risk controls."
  },
  {
    title: "Compliance",
    href: "/compliance",
    description: "Shariah-compliant token and router whitelisting registry."
  },
  {
    title: "Security",
    href: "/#security",
    description: "Internal reviews, EIP-712 signing, and governance roadmap."
  }
];

const devItems = [
  {
    title: "Documentation",
    href: "/docs",
    description: "Integration guides, technical specs, and deployment details."
  },
  {
    title: "SDK Reference",
    href: "/sdk",
    description: "Type-safe TypeScript SDK for compliant DeFi migrations."
  },
  {
    title: "GitHub",
    href: "https://github.com/AbZe628/gravitas-protocol",
    description: "Open-source smart contracts and protocol implementation.",
    external: true
  }
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [location] = useLocation();

  // Handle scroll lock for mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    }, 100);
  };

  const NavItem = ({ title, items }: { title: string, items: any[] }) => (
    <div 
      className="relative group"
      onMouseEnter={() => setActiveDropdown(title)}
      onMouseLeave={() => setActiveDropdown(null)}
    >
      <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-muted hover:text-paper transition-colors duration-150">
        {title} <ChevronDown size={14} className={`transition-transform duration-280 ${activeDropdown === title ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {activeDropdown === title && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full left-0 w-80 pt-2 z-50"
          >
            <div className="bg-surface border border-line rounded-xl p-3 shadow-2xl overflow-hidden">
              {items.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg hover:bg-ink group transition-colors"
                    >
                      <div className="text-sm font-bold text-paper group-hover:text-gold transition-colors flex items-center gap-2">
                        {item.title} <ExternalLink size={12} className="opacity-50" />
                      </div>
                      <div className="text-xs text-muted mt-1">{item.description}</div>
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        if (item.href.startsWith('/#') && location === '/') {
                          e.preventDefault();
                          scrollToSection(item.href.slice(2));
                          setActiveDropdown(null);
                        }
                      }}
                      className="block p-3 rounded-lg hover:bg-ink group transition-colors"
                    >
                      <div className="text-sm font-bold text-paper group-hover:text-gold transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-muted mt-1">{item.description}</div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-ink/80 backdrop-blur-xl" role="banner">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gold flex items-center justify-center shadow-lg shadow-gold/10 group-hover:shadow-gold/30 transition-all duration-280">
            <span className="text-ink font-black text-lg">G</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-paper group-hover:text-gold transition-colors duration-280">
            Gravitas Protocol
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          <NavItem title="Protocol" items={protocolItems} />
          <NavItem title="Developers" items={devItems} />
          <a 
            href="/#roadmap" 
            onClick={(e) => { if (location === '/') { e.preventDefault(); scrollToSection('roadmap'); } }} 
            className="px-4 py-2 text-sm font-medium text-muted hover:text-paper transition-colors duration-150"
          >
            Roadmap
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hidden sm:block">
            <Button variant="ghost" className="text-muted hover:text-paper hover:bg-surface font-bold text-sm">
              Launch App
            </Button>
          </Link>
          
          <a
            href="https://majlis.gravitasprotocol.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex"
          >
            <Button className="bg-transparent border border-gold text-gold hover:bg-gold/10 font-bold px-6 py-2 rounded-sm shadow-xl shadow-gold/5">
              Majlis
            </Button>
          </a>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-paper hover:bg-surface rounded-lg transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 top-20 z-40 bg-ink lg:hidden overflow-hidden"
          >
            <div className="container py-12 flex flex-col gap-12 h-full">
              <nav className="flex flex-col gap-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted px-4">Protocol</p>
                  {protocolItems.map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.2 }}
                    >
                      <Link
                        href={item.href}
                        onClick={(e) => {
                          if (item.href.startsWith('/#') && location === '/') {
                            e.preventDefault();
                            scrollToSection(item.href.slice(2));
                          } else {
                            setMobileMenuOpen(false);
                          }
                        }}
                        className="block px-4 py-3 text-2xl font-display text-paper hover:text-gold transition-colors"
                      >
                        {item.title}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted px-4">Developers</p>
                  {devItems.map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.4 }}
                    >
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={() => !item.external && setMobileMenuOpen(false)}
                        className="block px-4 py-3 text-2xl font-display text-paper hover:text-gold transition-colors"
                      >
                        {item.title}
                      </a>
                    </motion.div>
                  ))}
                </div>
              </nav>

              <div className="mt-auto pb-12 border-t border-line pt-8 space-y-4">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-surface border border-line text-paper h-14 text-lg font-bold">
                    Launch App
                  </Button>
                </Link>
                <a
                  href="https://majlis.gravitasprotocol.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-gold text-ink h-14 text-lg font-bold rounded-sm">
                    Majlis
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
