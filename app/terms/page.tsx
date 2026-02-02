import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
              Terms of Service
            </h1>

            <div className="prose prose-slate max-w-none">
              <p className="text-muted-foreground mb-6">
                Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Acceptance of Terms
                </h2>
                <p className="text-muted-foreground">
                  By accessing or using Hirvo.Ai, you agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use our service.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Description of Service
                </h2>
                <p className="text-muted-foreground">
                  Hirvo.Ai provides AI-powered resume analysis and optimization services. Our platform
                  simulates how Applicant Tracking Systems (ATS) and HR recruiters evaluate resumes,
                  and provides suggestions for improvement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  User Responsibilities
                </h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Provide accurate and truthful information in your resume</li>
                  <li>Maintain the confidentiality of your account credentials</li>
                  <li>Use the service only for lawful purposes</li>
                  <li>Not attempt to reverse-engineer or misuse our AI systems</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Disclaimer
                </h2>
                <p className="text-muted-foreground">
                  Hirvo.Ai provides resume analysis and suggestions based on AI algorithms and patterns
                  from successful resumes. However, we cannot guarantee that following our suggestions
                  will result in job interviews or offers. Employment outcomes depend on many factors
                  beyond resume optimization.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Intellectual Property
                </h2>
                <p className="text-muted-foreground">
                  You retain ownership of your resume content. By using our service, you grant us a
                  limited license to process and analyze your content to provide our services. Our
                  platform, algorithms, and branding remain our intellectual property.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Limitation of Liability
                </h2>
                <p className="text-muted-foreground">
                  Hirvo.Ai is provided &quot;as is&quot; without warranties of any kind. We are not liable
                  for any indirect, incidental, or consequential damages arising from your use of
                  our service.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Contact
                </h2>
                <p className="text-muted-foreground">
                  For questions about these Terms of Service, contact us at{" "}
                  <a href="mailto:legal@hirvo.ai" className="text-accent hover:underline">
                    legal@hirvo.ai
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
