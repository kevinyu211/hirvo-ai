import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  TrendingUp,
  Building2,
  Briefcase,
  BarChart3,
} from "lucide-react";
import { ExamplesTable } from "@/components/admin/ExamplesTable";
import { ExampleUploader } from "@/components/admin/ExampleUploader";
import { AdminHeader } from "@/components/shared/AdminHeader";
import type { Database as DatabaseTypes } from "@/lib/database.types";

type ResumeExample = DatabaseTypes["public"]["Tables"]["resume_examples"]["Row"];

interface ExampleStats {
  total: number;
  positive: number;
  negative: number;
  byIndustry: Record<string, number>;
  byRoleLevel: Record<string, number>;
  qualityExamples: number;
}

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all examples - cast to proper type since this table may not exist yet
  const { data: rawExamples, error } = await supabase
    .from("resume_examples")
    .select("*")
    .order("created_at", { ascending: false });

  const examples = (rawExamples || []) as unknown as ResumeExample[];

  // Calculate stats
  const stats: ExampleStats = {
    total: 0,
    positive: 0,
    negative: 0,
    byIndustry: {},
    byRoleLevel: {},
    qualityExamples: 0,
  };

  if (examples.length > 0 && !error) {
    stats.total = examples.length;
    stats.positive = examples.filter((e) => e.outcome_type === "positive").length;
    stats.negative = examples.filter((e) => e.outcome_type === "negative").length;
    stats.qualityExamples = examples.filter((e) => e.is_quality_example).length;

    for (const example of examples) {
      if (example.industry) {
        stats.byIndustry[example.industry] = (stats.byIndustry[example.industry] || 0) + 1;
      }
      if (example.role_level) {
        stats.byRoleLevel[example.role_level] = (stats.byRoleLevel[example.role_level] || 0) + 1;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Title */}
        <div className="mb-10 animate-fade-up">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Resume Examples Database
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage training examples for the self-improving optimization system.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10 animate-fade-up delay-100">
          <Card className="bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Examples
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.qualityExamples} quality examples
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                <span className="text-emerald-600">{stats.positive}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-red-600">{stats.negative}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Positive / Negative examples
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Industries
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {Object.keys(stats.byIndustry).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.entries(stats.byIndustry).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ") || "No data"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Role Levels
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {["entry", "mid", "senior", "executive"].map((level) => (
                  <Badge key={level} variant="outline" className="text-xs">
                    {level}: {stats.byRoleLevel[level] || 0}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Charts (simplified) */}
        {stats.total > 0 && (
          <div className="grid gap-6 lg:grid-cols-2 mb-10 animate-fade-up delay-150">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Industry Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byIndustry)
                    .sort(([, a], [, b]) => b - a)
                    .map(([industry, count]) => (
                      <div key={industry} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-28 capitalize">
                          {industry}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{
                              width: `${(count / stats.total) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Role Level Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["entry", "mid", "senior", "executive"].map((level) => {
                    const count = stats.byRoleLevel[level] || 0;
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-28 capitalize">
                          {level}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{
                              width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%",
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upload Section */}
        <section className="mb-10 animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              Upload New Example
            </h2>
          </div>
          <ExampleUploader />
        </section>

        {/* Examples Table */}
        <section className="animate-fade-up delay-250">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              All Examples
            </h2>
            <span className="text-sm text-muted-foreground">
              {stats.total} {stats.total === 1 ? "example" : "examples"}
            </span>
          </div>
          <ExamplesTable examples={examples} />
        </section>
      </main>
    </div>
  );
}
