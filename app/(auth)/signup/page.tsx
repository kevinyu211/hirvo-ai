import { Suspense } from "react";
import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { Logo } from "@/components/shared/Logo";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 gradient-emerald relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-32 right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 lg:px-16">
          <div className="max-w-lg">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-6">
              Start landing more interviews today
            </h2>
            <p className="text-lg text-white/80 mb-8">
              Join job seekers who use Hirvo.Ai to optimize their resumes
              and prepare for interviews with confidence.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: "98%", label: "Fortune 500 use ATS" },
                { value: "40%", label: "More interviews" },
                { value: "6 sec", label: "Avg. review time" },
                { value: "Free", label: "To get started" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="font-display text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/70">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8 pt-4">
            <Logo href="/" size="lg" />
          </div>

          <div className="text-center mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Create your account
            </h1>
            <p className="mt-2 text-muted-foreground">
              Start optimizing your resume for free
            </p>
          </div>

          <Suspense fallback={
            <div className="space-y-4">
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
              <div className="h-10 bg-muted animate-shimmer rounded-lg" />
            </div>
          }>
            <SignupForm />
          </Suspense>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:text-accent/80 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
