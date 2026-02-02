import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
              Privacy Policy
            </h1>

            <div className="prose prose-slate max-w-none">
              <p className="text-muted-foreground mb-6">
                Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Information We Collect
                </h2>
                <p className="text-muted-foreground mb-4">
                  When you use Hirvo.Ai, we collect information you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Account information (email address, name)</li>
                  <li>Resume content you upload for analysis</li>
                  <li>Job descriptions you provide</li>
                  <li>Usage data and preferences</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  How We Use Your Information
                </h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Analyze your resume and generate optimization suggestions</li>
                  <li>Process your requests and send related information</li>
                  <li>Improve our AI models and recommendation algorithms</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Data Security
                </h2>
                <p className="text-muted-foreground">
                  We implement appropriate security measures to protect your personal information.
                  Your resume data is encrypted in transit and at rest. We do not sell your
                  personal information to third parties.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Your Rights
                </h2>
                <p className="text-muted-foreground">
                  You have the right to access, correct, or delete your personal information.
                  You can export or delete your data at any time from your account settings.
                </p>
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold text-foreground mb-4">
                  Contact Us
                </h2>
                <p className="text-muted-foreground">
                  If you have questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@hirvo.ai" className="text-accent hover:underline">
                    privacy@hirvo.ai
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
