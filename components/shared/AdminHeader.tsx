"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  LogOut,
  Home,
  LayoutDashboard,
  Database,
  ChevronDown,
  FileSearch,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function AdminHeader() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Left side: Logo + Admin branding */}
        <div className="flex items-center gap-4">
          <Logo href="/" showText={false} className="sm:hidden" />
          <Logo href="/" className="hidden sm:flex" />
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center shadow-soft-sm">
              <Database className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-semibold text-xl text-foreground">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Right side: nav + user menu */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Quick Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/analyze">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <FileSearch className="h-4 w-4" />
                Analyze
              </Button>
            </Link>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {user?.email?.split("@")[0] || "Admin"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Mobile-only links */}
              <div className="md:hidden">
                <DropdownMenuItem asChild>
                  <Link href="/" className="flex items-center gap-2 cursor-pointer">
                    <Home className="h-4 w-4" />
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/analyze" className="flex items-center gap-2 cursor-pointer">
                    <FileSearch className="h-4 w-4" />
                    Analyze Resume
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>

              {/* Always visible */}
              <div className="px-2 py-1.5">
                <div className="text-sm text-muted-foreground">{user?.email}</div>
                <Badge variant="outline" className="mt-1 text-xs bg-violet-50 text-violet-700 border-violet-200">
                  Admin
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
