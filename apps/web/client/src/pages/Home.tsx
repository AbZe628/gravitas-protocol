import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Shield, Zap, Lock, ExternalLink, Github } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 geometric-pattern opacity-30" />
        <div className="container relative py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent-foreground text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Shariah-Compliant DeFi Infrastructure
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-heading font-bold mb-6 leading-tight">
              Institutional-Grade
              <br />
              <span className="text-accent">Liquidity Routing</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Gravitas Protocol enables deterministic, Shariah-compliant liquidity migrations across 
              Uniswap V2 and V3 with atomic execution guarantees and institutional-grade security.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/dashboard">
                  Launch App
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a 
                  href="https://github.com/AbZe628/gravitas-protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-5 w-5" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-4">
              Built for Institutions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade infrastructure designed for banks, funds, and institutional traders 
              requiring Shariah compliance and deterministic execution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Shariah Compliant</CardTitle>
                <CardDescription>
                  Built-in policy registry ensures all transactions meet Islamic finance principles 
                  with automated compliance checks.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Atomic Execution</CardTitle>
                <CardDescription>
                  All-or-nothing transaction guarantees with deterministic routing eliminate 
                  partial execution risks and MEV exposure.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>EIP-712 Signatures</CardTitle>
                <CardDescription>
                  Secure, human-readable transaction signing with nonce-based replay protection 
                  for institutional custody solutions.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Technical Overview */}
      <section className="py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
                Protocol Architecture
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Gravitas Protocol consists of three core smart contracts deployed on Arbitrum, 
                providing a complete infrastructure for Shariah-compliant liquidity management.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold mb-1">Policy Registry</h3>
                    <p className="text-sm text-muted-foreground">
                      Maintains whitelist of Shariah-compliant assets and authorized executors
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold mb-1">Teleport V2</h3>
                    <p className="text-sm text-muted-foreground">
                      Atomic migrations for Uniswap V2 LP positions with cooldown protection
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold mb-1">Teleport V3</h3>
                    <p className="text-sm text-muted-foreground">
                      EIP-712 signed migrations for Uniswap V3 NFT positions with optional rebalancing
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Deployment Information</CardTitle>
                <CardDescription>Arbitrum Sepolia Testnet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Policy Registry</p>
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono">0xbcaE...4679</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a 
                        href="https://sepolia.arbiscan.io/address/0xbcaE3069362B0f0b80f44139052f159456C84679"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Teleport V3</p>
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-mono">0x5D42...E993</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                    >
                      <a 
                        href="https://sepolia.arbiscan.io/address/0x5D423f8d01539B92D3f3953b91682D9884D1E993"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    ✅ 90%+ test coverage • ✅ Deterministic mocks • ✅ CI/CD enforced
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Connect your wallet and start interacting with Shariah-compliant liquidity infrastructure.
          </p>
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link href="/dashboard">
              Launch Dashboard
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2026 Gravitas Protocol. Built for institutional DeFi.
            </p>
            <div className="flex gap-6">
              <a 
                href="https://github.com/AbZe628/gravitas-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a 
                href="https://sepolia.arbiscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Arbiscan
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
