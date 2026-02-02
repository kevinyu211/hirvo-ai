import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Calendar, ArrowRight, MessageSquare, Video, Sparkles } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { DashboardHeader } from "@/components/shared/DashboardHeader";

type ResumeAnalysis = Database["public"]["Tables"]["resume_analyses"]["Row"];
type InterviewSession = Database["public"]["Tables"]["interview_sessions"]["Row"];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch resume analyses
  const { data: analysesData } = await supabase
    .from("resume_analyses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch interview sessions
  const { data: sessionsData } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", user.id)
    .in("session_type", ["visa_qa", "hr_interview"])
    .order("created_at", { ascending: false });

  const analyses = analysesData as ResumeAnalysis[] | null;
  const sessions = sessionsData as InterviewSession[] | null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Welcome section */}
        <div className="mb-10 animate-fade-up">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your resume analyses and interview preparation sessions.
          </p>
        </div>

        <div className="space-y-12">
          {/* Recent Analyses Section */}
          <section className="animate-fade-up delay-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                Recent Analyses
              </h2>
              {analyses && analyses.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"}
                </span>
              )}
            </div>

            {(!analyses || analyses.length === 0) ? (
              <Card className="border-dashed border-2 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                    <FileText className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    No analyses yet
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-sm">
                    Upload your resume and a job description to get AI-powered insights
                    for beating ATS filters and impressing recruiters.
                  </p>
                  <Link href="/analyze">
                    <Button className="gap-2 gradient-emerald text-white border-0 shadow-soft hover:shadow-glow transition-all">
                      <Sparkles className="h-4 w-4" />
                      Create your first analysis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {analyses.map((analysis, index) => (
                  <Card
                    key={analysis.id}
                    className="group card-interactive animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-3">
                        <CardTitle className="text-base leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                          {analysis.target_role || "Untitled Role"}
                        </CardTitle>
                        {analysis.ats_overall_score !== null && (
                          <Badge className={getScoreBadgeClass(analysis.ats_overall_score ?? 0)}>
                            {analysis.ats_overall_score}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {analysis.file_name}
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 pb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(analysis.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {analysis.ats_overall_score !== null && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">ATS:</span>
                            <span className={`font-semibold ${getScoreTextClass(analysis.ats_overall_score ?? 0)}`}>
                              {analysis.ats_overall_score}%
                            </span>
                          </div>
                        )}
                        {analysis.hr_overall_score !== null && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">HR:</span>
                            <span className={`font-semibold ${getScoreTextClass(analysis.hr_overall_score ?? 0)}`}>
                              {analysis.hr_overall_score}%
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t">
                      <Link href={`/results/${analysis.id}`} className="w-full">
                        <Button variant="ghost" className="w-full justify-between group/btn hover:bg-accent/5">
                          <span>View Results</span>
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Interview Sessions Section */}
          <section className="animate-fade-up delay-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                Interview Sessions
              </h2>
              {sessions && sessions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
                </span>
              )}
            </div>

            {(!sessions || sessions.length === 0) ? (
              <Card className="border-dashed border-2 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl icon-violet border flex items-center justify-center mb-6">
                    <Video className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                    No interview sessions yet
                  </h3>
                  <p className="text-muted-foreground mb-4 max-w-sm">
                    Complete a resume analysis to unlock AI-powered interview
                    preparation with our live avatar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session, index) => (
                  <Card
                    key={session.id}
                    className="group card-interactive animate-fade-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-3">
                        <CardTitle className="text-base leading-tight group-hover:text-accent transition-colors">
                          {getSessionTypeLabel(session.session_type)}
                        </CardTitle>
                        <Badge className={getSessionTypeBadgeClass(session.session_type)}>
                          {session.session_type === "visa_qa" ? "Visa" : "Interview"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(session.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {getTranscriptLength(session.transcript)} messages
                      </div>
                      {session.feedback && session.session_type === "hr_interview" && (
                        <div className="mt-3">
                          <Badge variant="outline" className="text-xs font-medium severity-success border">
                            Score: {getFeedbackScore(session.feedback)}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-3 border-t">
                      {session.analysis_id ? (
                        <Link href={`/interview/${session.analysis_id}`} className="w-full">
                          <Button variant="ghost" className="w-full justify-between group/btn hover:bg-accent/5">
                            <span>View Transcript</span>
                            <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="ghost" className="w-full justify-between opacity-50" disabled>
                          No linked analysis
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function getScoreBadgeClass(score: number): string {
  if (score >= 75) return "severity-success border";
  if (score >= 50) return "severity-warning border";
  return "severity-critical border";
}

function getScoreTextClass(score: number): string {
  if (score >= 75) return "text-[hsl(var(--severity-success))]";
  if (score >= 50) return "text-[hsl(var(--severity-warning))]";
  return "text-[hsl(var(--severity-critical))]";
}

function getSessionTypeLabel(type: string): string {
  switch (type) {
    case "visa_qa":
      return "Visa Q&A Session";
    case "hr_interview":
      return "HR Interview Prep";
    default:
      return "Interview Session";
  }
}

function getSessionTypeBadgeClass(type: string): string {
  switch (type) {
    case "visa_qa":
      return "icon-sky border";
    case "hr_interview":
      return "icon-violet border";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getTranscriptLength(transcript: unknown): number {
  if (!transcript || !Array.isArray(transcript)) return 0;
  return transcript.length;
}

function getFeedbackScore(feedback: unknown): string {
  if (!feedback || typeof feedback !== "object") return "N/A";
  const feedbackObj = feedback as Record<string, unknown>;
  if (typeof feedbackObj.overallScore === "number") {
    return String(feedbackObj.overallScore);
  }
  return "N/A";
}
