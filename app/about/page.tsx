import Link from "next/link";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Users,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Heart,
  Mail,
  MapPin,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 gradient-hero grain-overlay" />
          <div className="absolute inset-0 gradient-mesh opacity-60" />

          <div className="relative container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight animate-fade-up">
                About <span className="text-gradient-emerald">Hirvo.Ai</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-up delay-100">
                We&apos;re on a mission to level the playing field for job seekers by
                demystifying how resumes are evaluated by both machines and humans.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section id="mission" className="py-20 md:py-28 bg-card border-y">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Our Mission</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Helping Every Qualified Candidate Get Seen
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  98% of Fortune 500 companies use Applicant Tracking Systems (ATS) to filter
                  resumes before a human ever sees them. Up to 75% of qualified candidates are
                  rejected by these automated systems—not because they lack skills, but because
                  their resumes aren&apos;t optimized for the technology.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="bg-background">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                      Beat the Bots
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      We simulate real ATS software to show you exactly what automated systems
                      see—and what they miss—in your resume.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-background">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center mb-4">
                      <Users className="w-6 h-6 text-violet-500" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                      Impress Humans
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Our HR simulation combines pattern analysis, semantic matching, and AI
                      review to predict how recruiters will evaluate your resume.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-background">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                      Optimize with AI
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Get actionable suggestions powered by AI, with one-click fixes that
                      transform your resume into an interview-winning document.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Our Goals Section */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Our Goals</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  What We&apos;re Building Toward
                </h2>
              </div>

              <div className="space-y-6">
                {[
                  {
                    number: "01",
                    title: "Democratize Resume Optimization",
                    description:
                      "Make professional-grade resume analysis accessible to everyone, not just those who can afford career coaches.",
                  },
                  {
                    number: "02",
                    title: "Learn from Real Success",
                    description:
                      "Build a system that continuously improves by learning from resumes that actually land interviews—turning collective success into individual advantage.",
                  },
                  {
                    number: "03",
                    title: "Support International Talent",
                    description:
                      "Help visa holders and international job seekers navigate the unique challenges they face, with specialized guidance for work authorization questions.",
                  },
                  {
                    number: "04",
                    title: "Prepare Beyond the Resume",
                    description:
                      "Extend our AI capabilities to interview preparation, helping candidates practice with realistic scenarios tailored to their target roles.",
                  },
                  {
                    number: "05",
                    title: "Build Trust Through Transparency",
                    description:
                      "Show you exactly why we make each suggestion, with data-backed insights rather than black-box recommendations.",
                  },
                ].map((goal, i) => (
                  <div
                    key={i}
                    className="flex gap-6 p-6 rounded-2xl bg-card border hover:border-accent/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 gradient-emerald text-white rounded-xl flex items-center justify-center font-display font-bold">
                      {goal.number}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                        {goal.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {goal.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 md:py-28 bg-card border-y">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <Heart className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-accent">Our Values</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  What Drives Us
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    title: "User-First Design",
                    description:
                      "Every feature we build starts with one question: Will this help someone land their dream job?",
                  },
                  {
                    title: "Honest Feedback",
                    description:
                      "We tell you what you need to hear, not just what you want to hear. Constructive criticism leads to real improvement.",
                  },
                  {
                    title: "Continuous Learning",
                    description:
                      "Our system gets smarter over time, learning from patterns in successful resumes to give you cutting-edge advice.",
                  },
                  {
                    title: "Accessibility",
                    description:
                      "Professional resume help shouldn't be a luxury. We're committed to keeping core features free and accessible.",
                  },
                ].map((value, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-background border">
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                <Mail className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Get In Touch</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Have Questions?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                We&apos;d love to hear from you. Whether you have feedback, questions,
                or just want to say hello, reach out anytime.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <a
                  href="mailto:hello@hirvo.ai"
                  className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  hello@hirvo.ai
                </a>
                <span className="hidden sm:block text-muted-foreground">|</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-5 h-5" />
                  San Francisco, CA
                </span>
              </div>

              <Link href="/signup">
                <Button
                  size="lg"
                  className="gradient-emerald text-white shadow-soft hover:shadow-glow transition-all duration-300 border-0"
                >
                  Start Optimizing Your Resume
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
