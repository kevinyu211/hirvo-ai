"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/Logo";
import type { User } from "@supabase/supabase-js";

export function Footer() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        setIsAdmin(profile?.is_admin === true);
      }
    }

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <footer className="bg-foreground text-white/60 py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <Logo href="/" size="sm" className="[&_span]:text-white [&_.text-accent]:text-accent" />
            </div>
            <p className="text-sm text-white/50 leading-relaxed">
              AI-powered resume optimization to help you land more interviews.
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/analyze" className="hover:text-white transition-colors">
                  Analyze Resume
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about#mission" className="hover:text-white transition-colors">
                  Our Mission
                </Link>
              </li>
              <li>
                <Link href="/about#contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Account Column */}
          <div>
            <h3 className="font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-3 text-sm">
              {user ? (
                <>
                  <li>
                    <Link href="/dashboard" className="hover:text-white transition-colors">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/api/auth/logout" className="hover:text-white transition-colors">
                      Log Out
                    </Link>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link href="/admin" className="hover:text-violet-400 transition-colors text-violet-400/80">
                        Admin Panel
                      </Link>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login" className="hover:text-white transition-colors">
                      Login
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup" className="hover:text-white transition-colors">
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-white/40">
              &copy; {new Date().getFullYear()} Hirvo.Ai. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-white/40">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white/60 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="text-xs text-center text-white/30 mt-4">
            AI-powered resume analysis and interview preparation. Results may vary.
          </p>
        </div>
      </div>
    </footer>
  );
}
