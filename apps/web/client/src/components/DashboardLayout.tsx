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
  X,
  Settings,
  Wallet,
  Cpu
} from "lucide-react";
import { useLocation } from "wouter";
import { useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { motion } from "framer-motion";
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
    <div className="min-h-screen bg-[var(--g-navy)] text-[var(--g-paper)] flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-[var(--g-line)] bg-[var(--g-navy)]/95 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
          >
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--g-gold)] to-[var(--g-gold-soft)] flex items-center justify-center">
              <span className="text-[var(--g-navy)] font-bold text-sm">G</span>
            </div>
            <span className="font-bold text-[var(--g-paper)]">Gravitas</span>
          </button>

          <div className="flex items-center gap-2">
            {!isConnected && (
              <Button
                size="sm"
                onClick={() => setWalletModalOpen(true)}
                className="bg-[var(--g-gold)] text-[var(--g-navy)] hover:bg-[var(--g-gold-soft)] font-bold h-8 px-3 text-xs"
              >
                Connect
              </Button>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[var(--g-paper-dim)] hover:bg-[var(--g-surface)]"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-[var(--g-navy)] border-[var(--g-line)] p-0">
                <nav className="flex flex-col gap-1 pt-8 px-4">
                  <Button
                    variant="ghost"
                    onClick={() => { navigate("/"); setMobileMenuOpen(false); }}
                    className="justify-start text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] h-12"
                  >
                    <Home className="h-4 w-4 mr-3" />
                    Home
                  </Button>
                  <Separator className="bg-[var(--g-line)] my-2" />
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                      className={`justify-start h-12 ${
                        isActive(item.path)
                          ? "bg-[var(--g-gold-wash)] text-[var(--g-gold-soft)] border border-[var(--g-gold)]/20"
                          : "text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)]"
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-[var(--g-line)] bg-[var(--g-navy)] flex-col overflow-y-auto relative z-20">
        <button
          onClick={() => navigate("/")}
          className="p-8 border-b border-[var(--g-line)] hover:bg-[var(--g-surface)] transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[var(--g-gold)] to-[var(--g-gold-soft)] flex items-center justify-center shadow-lg shadow-[var(--g-gold)]/10 group-hover:shadow-[var(--g-gold)]/30 transition-all">
              <span className="text-[var(--g-navy)] font-bold text-xl">G</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--g-paper)]">Gravitas</h1>
              <p className="g-label text-[10px] text-[var(--g-muted)]">Dashboard</p>
            </div>
          </div>
        </button>

        <nav className="flex-1 p-6 space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full justify-start text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)] h-11"
          >
            <Home className="h-4 w-4 mr-3" />
            Home
          </Button>
          <Separator className="bg-[var(--g-line)] my-4" />
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className={`w-full justify-start h-11 transition-all ${
                isActive(item.path)
                  ? "bg-[var(--g-gold-wash)] text-[var(--g-gold-soft)] border border-[var(--g-gold)]/20"
                  : "text-[var(--g-paper-dim)] hover:text-[var(--g-paper)] hover:bg-[var(--g-surface)]"
              }`}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-6 border-t border-[var(--g-line)] bg-[var(--g-surface)]/30">
          {isConnected && address ? (
            <ConnectedWallet
              address={address}
              chainName={chain?.name}
              onDisconnect={() => disconnect()}
            />
          ) : (
            <Button
              onClick={() => setWalletModalOpen(true)}
              className="w-full bg-[var(--g-gold)] text-[var(--g-navy)] hover:bg-[var(--g-gold-soft)] h-11 font-bold"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header Bar */}
        <header className="h-16 border-b border-[var(--g-line)] bg-[var(--g-navy)]/50 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 relative z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-[var(--g-text-base)] font-bold text-[var(--g-paper)]">
              {navItems.find((item) => isActive(item.path))?.label || "Dashboard"}
            </h2>
            {chain?.id !== arbitrumSepolia.id && isConnected && (
              <span 
                className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded cursor-pointer"
                onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
              >
                Wrong Network
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://majlis.gravitasprotocol.xyz"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" className="bg-[var(--g-gold-wash)] text-[var(--g-gold-soft)] border border-[var(--g-gold)]/20 hover:bg-[var(--g-gold-wash)]/80 h-8 text-[10px] uppercase tracking-widest font-bold">
                Majlis
              </Button>
            </a>
            <a
              href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--g-muted)] hover:text-[var(--g-paper)] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto relative">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="p-8 lg:p-12"
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
