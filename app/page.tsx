import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 pt-20">
        <section className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 gradient-hero grain-overlay" />
          <div className="absolute inset-0 gradient-mesh opacity-60" />

          {/* Floating shapes */}
          <div className="absolute top-32 left-[10%] w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-[15%] w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float delay-500" />

          <div className="relative container mx-auto px-4 md:px-6 py-20 md:py-32 lg:py-40">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-fade-up">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
                <span className="text-sm font-medium text-accent">
                  AI-Powered Resume Analysis
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight animate-fade-up delay-100">
                Get your resume past{" "}
                <span className="text-gradient-emerald">ATS filters</span>{" "}
                and into human hands
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up delay-200">
                Our dual-analysis system simulates how real ATS software and HR recruiters
                evaluate your resume, then shows you exactly how to improve it.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up delay-300">
                <Link href="/signup">
                  <Button
                    variant="accent"
                    size="xl"
                    className="text-lg px-10 py-6 h-auto min-w-[220px]"
                  >
                    Analyze My Resume
                    <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="xl"
                    className="text-lg px-10 py-6 h-auto border-2 hover:border-accent hover:bg-accent/5 transition-all duration-300 min-w-[220px]"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <p className="text-sm text-muted-foreground mt-8 animate-fade-up delay-400">
                Free to use. No credit card required.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative bg-card border-y">
          <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 max-w-4xl mx-auto">
              {[
                { value: "98%", label: "of Fortune 500 use ATS" },
                { value: "75%", label: "auto-rejection threshold" },
                { value: "6 sec", label: "avg. recruiter review time" },
                { value: "40%", label: "more interviews with optimization" },
              ].map((stat, i) => (
                <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="font-display text-3xl md:text-4xl font-bold text-accent mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-20 md:py-28 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16 md:mb-20">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                How Hirvo.Ai Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Two perspectives. One optimized resume.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {/* ATS Simulation */}
              <div className="group card-elevated p-8 md:p-10 animate-fade-up">
                <div className="w-14 h-14 rounded-2xl icon-red border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  ATS Simulation
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We mimic how real Applicant Tracking Systems like Workday, Greenhouse,
                  and Lever filter your resume using keyword matching and formatting validation.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {["Keyword match scoring", "Section detection", "Format compliance"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* HR Analysis */}
              <div className="group card-elevated p-8 md:p-10 animate-fade-up delay-100">
                <div className="w-14 h-14 rounded-2xl icon-violet border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  HR Recruiter Analysis
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Three-layer human perspective: formatting patterns from successful resumes,
                  semantic matching, and AI acting as an experienced recruiter.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {["Pattern analysis", "Semantic relevance", "Narrative review"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interview Prep */}
              <div className="group card-elevated p-8 md:p-10 animate-fade-up delay-200">
                <div className="w-14 h-14 rounded-2xl icon-emerald border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  AI Interview Prep
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Practice with a live AI avatar that acts as an HR interviewer,
                  plus visa Q&A support for international job seekers.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {["Real-time feedback", "Role-specific questions", "Visa guidance"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="relative py-20 md:py-28 bg-card border-y">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Three Steps to Success
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Upload, analyze, and optimize in minutes
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
                {/* Connecting line (desktop) */}
                <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-accent/20 via-accent to-accent/20" />

                {[
                  {
                    step: "1",
                    title: "Upload Your Resume",
                    description: "Drop your PDF or DOCX resume and paste the job description you're targeting."
                  },
                  {
                    step: "2",
                    title: "Get Dual Analysis",
                    description: "See your ATS and HR scores with detailed breakdowns of what's working and what needs fixing."
                  },
                  {
                    step: "3",
                    title: "Optimize & Export",
                    description: "Apply one-click suggestions in our editor, then download your improved resume."
                  }
                ].map((item, i) => (
                  <div key={i} className="relative text-center animate-fade-up" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="relative z-10 w-12 h-12 gradient-emerald text-white rounded-2xl flex items-center justify-center text-lg font-display font-bold mx-auto mb-6 shadow-glow">
                      {item.step}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Editor Preview Section */}
        <section className="relative py-20 md:py-28 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-40" />

          <div className="relative container mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
              <div className="animate-slide-in-left">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Fix issues with one click
                </h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Our Grammarly-style editor highlights exactly what needs attention.
                  Toggle between ATS and HR views, click any highlight to see the issue,
                  and apply the fix instantly.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Missing keywords shown in red",
                    "Formatting issues flagged with suggestions",
                    "One-click fixes update your resume instantly",
                    "Re-analyze after editing to track improvement"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button variant="accent" size="lg">
                    Try the Editor Free
                    <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>
                </Link>
              </div>

              {/* Editor mockup */}
              <div className="relative animate-slide-in-right">
                <div className="absolute -inset-4 bg-gradient-to-r from-accent/20 to-violet-500/20 rounded-3xl blur-2xl opacity-30" />
                <div className="relative card-elevated p-6 md:p-8 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex gap-2 ml-4">
                      <div className="px-3 py-1 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                        ATS (3)
                      </div>
                      <div className="px-3 py-1 rounded-md bg-muted border text-xs text-muted-foreground">
                        HR (5)
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 font-mono text-sm">
                    <p className="text-foreground">
                      <span className="text-muted-foreground">EXPERIENCE</span>
                    </p>
                    <p>
                      <span className="bg-emerald-100/80 border-b-2 border-emerald-400 px-0.5 rounded">Senior Software Engineer</span> at TechCorp
                    </p>
                    <p className="text-foreground/80">
                      Led development of{" "}
                      <span className="bg-red-100/80 border-b-2 border-red-400 px-0.5 rounded cursor-help" title="Add keyword: React">
                        frontend applications
                      </span>{" "}
                      serving 2M+ users
                    </p>
                    <p className="text-foreground/80">
                      Improved{" "}
                      <span className="bg-amber-100/80 border-b-2 border-amber-400 px-0.5 rounded cursor-help" title="Quantify: add specific metric">
                        performance
                      </span>{" "}
                      across all systems
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t flex gap-2 text-2xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-red-200 border border-red-300" />
                      Missing Keyword
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-300" />
                      Weak Usage
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
                      Strong Match
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-20 md:py-28 lg:py-32 gradient-charcoal text-white overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative container mx-auto px-4 md:px-6 text-center">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6 animate-fade-up">
              Ready to land more interviews?
            </h2>
            <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto animate-fade-up delay-100">
              Stop guessing what recruiters want. Get data-driven insights
              and optimize your resume with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-200">
              <Link href="/signup">
                <Button
                  size="xl"
                  className="bg-white text-emerald-600 hover:bg-white/95 text-lg px-10 py-6 h-auto shadow-float hover:shadow-float-lg hover:-translate-y-1 transition-all duration-300 ease-out-back min-w-[220px] font-bold"
                >
                  Get Started Free
                </Button>
              </Link>
            </div>
            <p className="text-sm text-white/50 mt-6 animate-fade-up delay-300">
              No credit card required. Analyze your first resume in under 2 minutes.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
