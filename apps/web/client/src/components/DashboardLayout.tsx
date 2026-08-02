import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  History,
  Menu,
  ExternalLink,
  Settings,
  Wallet,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { motion, AnimatePresence } from "framer-motion";
import { WalletModal, ConnectedWallet } from "./WalletModal";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Auto-switch to Arbitrum Sepolia
  useEffect(() => {
    if (isConnected && chain?.id !== arbitrumSepolia.id) {
      switchChain({ chainId: arbitrumSepolia.id });
    }
  }, [isConnected, chain, switchChain]);

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/dashboard" },
    { icon: ArrowLeftRight, label: "Migrate", path: "/dashboard/migrate" },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: History, label: "History", path: "/dashboard/history" },
    { icon: Settings, label: "Admin", path: "/admin" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location === "/dashboard";
    }
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col lg:flex-row overflow-hidden selection:bg-gold/30 selection:text-goldsoft">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-line bg-ink/95 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 shrink-0 group"
          >
            <div className="h-10 w-10 rounded-xl bg-gold flex items-center justify-center group-hover:shadow-lg group-hover:shadow-gold/20 transition-all">
              <span className="text-ink font-black text-lg">G</span>
            </div>
            <span className="font-display font-bold text-xl text-paper group-hover:text-gold transition-colors">Gravitas</span>
          </button>

          <div className="flex items-center gap-4">
            {!isConnected && (
              <Button
                size="sm"
                onClick={() => setWalletModalOpen(true)}
                className="bg-gold text-ink hover:bg-goldsoft font-bold h-10 px-4 rounded-sm"
              >
                Connect
              </Button>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-paper hover:bg-surface h-12 w-12"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full bg-ink border-line p-0">
                <div className="flex flex-col h-full">
                  <div className="p-8 border-b border-line flex justify-between items-center">
                    <span className="font-display font-bold text-2xl">Menu</span>
                    <Button variant="ghost" onClick={() => setMobileMenuOpen(false)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                  </div>
                  <nav className="flex-1 p-6 space-y-4">
                    <Button
                      variant="ghost"
                      onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
                      className="w-full justify-start text-muted hover:text-paper hover:bg-surface h-16 text-xl font-display"
                    >
                      <Home className="h-6 w-6 mr-4 text-gold" />
                      Home
                    </Button>
                    <Separator className="bg-line my-6" />
                    {navItems.map((item) => (
                      <Button
                        key={item.path}
                        variant="ghost"
                        onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                        className={`w-full justify-start h-16 text-xl font-display transition-all ${
                          isActive(item.path)
                            ? "bg-gold/5 text-gold border border-gold/20 font-bold"
                            : "text-muted hover:text-paper hover:bg-surface"
                        }`}
                      >
                        <item.icon className="h-6 w-6 mr-4" />
                        {item.label}
                      </Button>
                    ))}
                  </nav>
                  <div className="p-8 border-t border-line bg-surface/20">
                    <a
                      href="https://majlis.gravitasprotocol.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full"
                    >
                      <Button className="w-full bg-gold text-ink h-16 text-xl font-bold rounded-sm">
                        Majlis
                      </Button>
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 border-r border-line bg-ink flex-col overflow-y-auto relative z-20">
        <button
          onClick={() => navigate("/")}
          className="p-10 border-b border-line hover:bg-surface/50 transition-all text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gold flex items-center justify-center shadow-lg shadow-gold/10 group-hover:shadow-gold/30 transition-all">
              <span className="text-ink font-black text-xl">G</span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-paper group-hover:text-gold transition-colors">Gravitas</h1>
              <p className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">Institutional App</p>
            </div>
          </div>
        </button>

        <nav className="flex-1 p-8 space-y-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full justify-start text-muted hover:text-paper hover:bg-surface h-12 font-medium transition-all group"
          >
            <Home className="h-4 w-4 mr-4 text-gold/60 group-hover:text-gold transition-colors" />
            Home
          </Button>
          <Separator className="bg-line my-6" />
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className={`w-full justify-start h-12 transition-all font-medium ${
                isActive(item.path)
                  ? "bg-gold/5 text-gold border border-gold/20 font-bold shadow-xl shadow-gold/5"
                  : "text-muted hover:text-paper hover:bg-surface"
              }`}
            >
              <item.icon className="h-4 w-4 mr-4" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-8 border-t border-line bg-surface/20 backdrop-blur-xl">
          {isConnected && address ? (
            <ConnectedWallet
              address={address}
              chainName={chain?.name}
              onDisconnect={() => disconnect()}
            />
          ) : (
            <Button
              onClick={() => setWalletModalOpen(true)}
              className="w-full bg-gold text-ink hover:bg-goldsoft h-12 font-bold rounded-sm shadow-xl shadow-gold/10"
            >
              <Wallet className="h-4 w-4 mr-3" />
              Connect Wallet
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-ink">
        {/* Header Bar */}
        <header className="h-20 border-b border-line bg-ink/50 backdrop-blur-xl flex items-center justify-between px-10 shrink-0 relative z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-display font-bold text-paper">
              {navItems.find((item) => isActive(item.path))?.label || "Dashboard"}
            </h2>
            <AnimatePresence>
              {chain?.id !== arbitrumSepolia.id && isConnected && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full cursor-pointer hover:bg-amber-400/20 transition-colors uppercase tracking-widest"
                  onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
                >
                  Wrong Network
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://majlis.gravitasprotocol.xyz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="bg-gold/5 text-gold border border-gold/20 hover:bg-gold/10 h-10 px-6 text-[10px] uppercase tracking-[0.2em] font-bold rounded-sm transition-all">
                Majlis
              </Button>
            </a>
            <div className="h-8 w-px bg-line" />
            <a
              href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-gold transition-colors p-2 hover:bg-surface rounded-lg"
              title="View Protocol on Arbiscan"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="p-10 lg:p-16 max-w-6xl"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Wallet Modal */}
      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
}
