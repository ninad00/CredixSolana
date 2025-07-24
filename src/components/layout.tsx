import { NavLink, Outlet } from "react-router-dom";
import { Activity, Coins, Settings, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
    {
        name: "Collateral",
        href: "/collateral",
        icon: Layers,
        description: "Deposit collateral tokens"
    },
    {
        name: "Liquidity",
        href: "/liquidity",
        icon: Activity,
        description: "Provide liquidity and earn fees"
    },
    {
        name: "Create Token",
        href: "/create-token",
        icon: Coins,
        description: "Create new token configurations"
    },
    {
        name: "Engine",
        href: "/engine",
        icon: Settings,
        description: "Initialize the lending engine"
    }
];

export default function Layout() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-gradient-card shadow-card">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                    <div className="h-8 w-8 bg-gradient-primary rounded-lg shadow-primary animate-glow-pulse"></div>
                                    <h1 className="text-xl font-bold text-foreground">SolanaLend</h1>
                                </div>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                {navigation.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.href}
                                        className={({ isActive }) =>
                                            cn(
                                                "relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 group",
                                                isActive
                                                    ? "bg-primary text-primary-foreground shadow-primary"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                            )
                                        }
                                    >
                                        <div className="flex items-center space-x-2">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.name}</span>
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                            {item.description}
                                        </div>
                                    </NavLink>
                                ))}
                            </div>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation */}
            <div className="md:hidden border-b border-border bg-gradient-card">
                <div className="px-2 pt-2 pb-3 space-y-1">
                    {navigation.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    "block px-3 py-2 rounded-lg text-base font-medium transition-all duration-300",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                                )
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <item.icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </div>
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-gradient-card">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
                        <div className="flex items-center space-x-4">
                            <div className="h-6 w-6 bg-gradient-primary rounded shadow-primary"></div>
                            <span className="text-sm text-muted-foreground">
                                SolanaLend - Decentralized Lending Protocol
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button variant="ghost" size="sm" asChild>
                                <a href="https://explorer.solana.com" target="_blank" rel="noopener noreferrer">
                                    Explorer
                                </a>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                                <a href="https://docs.solana.com" target="_blank" rel="noopener noreferrer">
                                    Docs
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}