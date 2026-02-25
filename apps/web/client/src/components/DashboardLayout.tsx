import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  History,
  Menu,
  Wallet,
  ExternalLink,
  LogOut,
  X,
  Settings,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { useEffect } from "react";
import { motion } from "framer-motion";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#0A1628]">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b border-[#D4AF37]/20 bg-[#0A1628]/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
              <span className="text-[#0A1628] font-bold text-lg">G</span>
            </div>
            <div className="hidden xs:block">
              <h1 className="text-sm font-bold text-white">Gravitas</h1>
              <p className="text-xs text-white/40">Dashboard</p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {isConnected && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0F1E35]/50 border border-[#D4AF37]/20">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs font-mono text-white/70">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[#D4AF37] hover:bg-[#D4AF37]/10 lg:hidden"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[280px] bg-[#0A1628] border-[#D4AF37]/20 p-0"
              >
                <nav className="flex flex-col gap-1 pt-6 px-4">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/");
                      setMobileMenuOpen(false);
                    }}
                    className="justify-start text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 h-10"
                  >
                    <Home className="h-4 w-4 mr-3" />
                    Home
                  </Button>
                  <Separator className="bg-[#D4AF37]/20 my-2" />
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      onClick={() => {
                        navigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`justify-start h-10 ${
                        isActive(item.path)
                          ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                          : "text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                  <Separator className="bg-[#D4AF37]/20 my-2" />
                  {isConnected ? (
                    <>
                      <div className="px-3 py-3">
                        <p className="text-xs text-white/40 mb-1">Connected Wallet</p>
                        <p className="text-xs font-mono text-white mb-2">
                          {address?.slice(0, 10)}...{address?.slice(-8)}
                        </p>
                        <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                          {chain?.name || "Unknown"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          disconnect();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 h-9 text-xs"
                      >
                        <LogOut className="h-3 w-3 mr-2" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => {
                        connect({ connector: connectors[0] });
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 h-9 text-xs"
                    >
                      <Wallet className="h-3 w-3 mr-2" />
                      Connect Wallet
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-64 border-r border-[#D4AF37]/20 bg-[#0A1628]/50 backdrop-blur flex flex-col overflow-y-auto"
        >
          {/* Logo */}
          <button onClick={() => navigate("/")} className="p-6 border-b border-[#D4AF37]/20 shrink-0 w-full hover:bg-[#D4AF37]/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center flex-shrink-0">
                <span className="text-[#0A1628] font-bold text-2xl">G</span>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-white">Gravitas</h1>
                <p className="text-xs text-white/50">Protocol Dashboard</p>
              </div>
            </div>
          </button>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full justify-start text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 h-10"
            >
              <Home className="h-4 w-4 mr-3" />
              Home
            </Button>
            <Separator className="bg-[#D4AF37]/20 my-3" />
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className={`w-full justify-start h-10 ${
                  isActive(item.path)
                    ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                    : "text-white/70 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10"
                }`}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Wallet Section */}
          <div className="p-4 border-t border-[#D4AF37]/20 shrink-0">
            {isConnected ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#0F1E35]/50 border border-[#D4AF37]/10">
                  <p className="text-xs text-white/50 mb-1">Connected Wallet</p>
                  <p className="text-xs font-mono text-white mb-2 break-all">
                    {address?.slice(0, 12)}...{address?.slice(-10)}
                  </p>
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                    {chain?.name || "Unknown"}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnect()}
                  className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 h-9 text-xs"
                >
                  <LogOut className="h-3 w-3 mr-2" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 h-10 text-sm font-semibold"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            )}
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <header className="h-16 border-b border-[#D4AF37]/20 bg-[#0A1628]/50 backdrop-blur flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">
                {navItems.find((item) => isActive(item.path))?.label || "Dashboard"}
              </h2>
              {chain?.id !== arbitrumSepolia.id && isConnected && (
                <Badge variant="outline" className="border-red-500 text-red-500 text-xs shrink-0">
                  Wrong Network
                </Badge>
              )}
            </div>
            <a
              href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button
                variant="outline"
                size="sm"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 h-9 text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Arbiscan
              </Button>
            </a>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      {/* Mobile Content */}
      <main className="lg:hidden pb-safe">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 space-y-4"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
