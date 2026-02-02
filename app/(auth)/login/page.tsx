import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/shared/Logo";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8 pt-4">
            <Logo href="/" size="lg" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
            </div>
          }>
            <LoginForm />
          </Suspense>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-accent hover:text-accent/80 transition-colors">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 gradient-charcoal relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-accent rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="max-w-lg">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-6">
              Get your resume past ATS filters and into human hands
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Our AI-powered analysis helps you optimize your resume for both automated
              screening systems and human recruiters.
            </p>

            {/* Features list */}
            <ul className="space-y-4">
              {[
                "ATS simulation that mimics real systems",
                "HR recruiter perspective analysis",
                "One-click improvement suggestions",
                "AI interview preparation"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-white/80">
                  <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
