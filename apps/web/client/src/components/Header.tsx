import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Github, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

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
  const [location] = useLocation();

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--g-line)] bg-[var(--g-navy)]/90 backdrop-blur-xl" role="banner">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--g-gold)] to-[var(--g-gold-soft)] flex items-center justify-center shadow-lg shadow-[var(--g-gold)]/20 group-hover:shadow-[var(--g-gold)]/40 transition-shadow">
            <span className="text-[var(--g-navy)] font-black text-sm">G</span>
          </div>
          <span className="font-bold text-[var(--g-paper)] hidden sm:block">Gravitas Protocol</span>
          <span className="font-bold text-[var(--g-paper)] sm:hidden">Gravitas</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] transition-colors">
                  Protocol
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-[var(--g-surface)] border border-[var(--g-line)] shadow-xl">
                    {protocolItems.map((item) => (
                      <li key={item.title}>
                        <NavigationMenuLink asChild>
                          {item.href.startsWith('/#') ? (
                            <a
                              href={item.href}
                              onClick={(e) => {
                                if (location === '/') {
                                  e.preventDefault();
                                  scrollToSection(item.href.slice(2));
                                }
                              }}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-[var(--g-line)] hover:text-[var(--g-paper)]"
                            >
                              <div className="text-sm font-medium leading-none text-[var(--g-paper)]">{item.title}</div>
                              <p className="line-clamp-2 text-xs leading-snug text-[var(--g-muted)]">
                                {item.description}
                              </p>
                            </a>
                          ) : (
                            <Link
                              href={item.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-[var(--g-line)] hover:text-[var(--g-paper)]"
                            >
                              <div className="text-sm font-medium leading-none text-[var(--g-paper)]">{item.title}</div>
                              <p className="line-clamp-2 text-xs leading-snug text-[var(--g-muted)]">
                                {item.description}
                              </p>
                            </Link>
                          )}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] transition-colors">
                  Developers
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-[var(--g-surface)] border border-[var(--g-line)] shadow-xl">
                    {devItems.map((item) => (
                      <li key={item.title}>
                        <NavigationMenuLink asChild>
                          {item.external ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-[var(--g-line)] hover:text-[var(--g-paper)]"
                            >
                              <div className="flex items-center gap-1.5 text-sm font-medium leading-none text-[var(--g-paper)]">
                                {item.title}
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </div>
                              <p className="line-clamp-2 text-xs leading-snug text-[var(--g-muted)]">
                                {item.description}
                              </p>
                            </a>
                          ) : (
                            <Link
                              href={item.href}
                              className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-[var(--g-line)] hover:text-[var(--g-paper)]"
                            >
                              <div className="text-sm font-medium leading-none text-[var(--g-paper)]">{item.title}</div>
                              <p className="line-clamp-2 text-xs leading-snug text-[var(--g-muted)]">
                                {item.description}
                              </p>
                            </Link>
                          )}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <a href="/#roadmap" onClick={(e) => { if (location === '/') { e.preventDefault(); scrollToSection('roadmap'); } }} className="px-3 py-2 text-sm text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] transition-colors rounded-lg hover:bg-[var(--g-surface)]">Roadmap</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="hidden sm:block">
            <Button
              variant="outline"
              size="sm"
              className="border-[var(--g-line)] text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] text-xs sm:text-sm px-3 sm:px-4"
            >
              Launch App
            </Button>
          </Link>
          
          <a
            href="https://majlis.gravitasprotocol.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex"
          >
            <Button
              size="sm"
              className="bg-[var(--g-gold)] text-[var(--g-navy)] hover:bg-[var(--g-gold-soft)] font-semibold shadow-lg shadow-[var(--g-gold)]/20 text-xs sm:text-sm px-3 sm:px-4 border border-[var(--g-gold-soft)]"
            >
              Majlis
            </Button>
          </a>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] transition-colors rounded-lg hover:bg-[var(--g-surface)]"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-[var(--g-line)] bg-[var(--g-navy)]/98 backdrop-blur-xl overflow-hidden"
          >
            <nav className="container px-4 py-6 flex flex-col gap-6 max-w-7xl mx-auto">
              <div>
                <div className="text-[var(--g-muted)] text-[10px] uppercase tracking-widest mb-3 px-4">Protocol</div>
                <div className="flex flex-col gap-1">
                  {protocolItems.map((item) => (
                    item.href.startsWith('/#') ? (
                      <a
                        key={item.title}
                        href={item.href}
                        onClick={(e) => {
                          if (location === '/') {
                            e.preventDefault();
                            scrollToSection(item.href.slice(2));
                          }
                        }}
                        className="px-4 py-3 text-sm text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] rounded-lg transition-colors"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 text-sm text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] rounded-lg transition-colors"
                      >
                        {item.title}
                      </Link>
                    )
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[var(--g-muted)] text-[10px] uppercase tracking-widest mb-3 px-4">Developers</div>
                <div className="flex flex-col gap-1">
                  {devItems.map((item) => (
                    item.external ? (
                      <a
                        key={item.title}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-4 py-3 text-sm text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] rounded-lg transition-colors"
                      >
                        {item.title}
                        <ExternalLink className="h-4 w-4 opacity-50" />
                      </a>
                    ) : (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 text-sm text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] rounded-lg transition-colors"
                      >
                        {item.title}
                      </Link>
                    )
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--g-line)] pt-6 flex flex-col gap-3">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-[var(--g-line)] text-[var(--g-paper)]">Launch App</Button>
                </Link>
                <a
                  href="https://majlis.gravitasprotocol.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button className="w-full bg-[var(--g-gold)] text-[var(--g-navy)] hover:bg-[var(--g-gold-soft)] font-semibold border border-[var(--g-gold-soft)]">
                    Majlis
                  </Button>
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
