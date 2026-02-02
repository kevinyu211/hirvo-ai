"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ResumeExample {
  id: string;
  job_description: string;
  job_title: string | null;
  company_name: string | null;
  industry: string | null;
  role_level: string | null;
  resume_text: string;
  outcome_type: string;
  outcome_detail: string | null;
  required_skills: string[] | null;
  candidate_skills: string[] | null;
  is_quality_example: boolean | null;
  source: string;
  created_at: string;
}

interface ExamplesTableProps {
  examples: ResumeExample[];
}

export function ExamplesTable({ examples }: ExamplesTableProps) {
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [roleLevelFilter, setRoleLevelFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get unique industries and role levels
  const industries = Array.from(
    new Set(examples.map((e) => e.industry).filter(Boolean))
  ) as string[];
  const roleLevels = Array.from(
    new Set(examples.map((e) => e.role_level).filter(Boolean))
  ) as string[];

  // Filter examples
  const filteredExamples = examples.filter((example) => {
    const matchesSearch =
      !search ||
      example.job_title?.toLowerCase().includes(search.toLowerCase()) ||
      example.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      example.job_description.toLowerCase().includes(search.toLowerCase());

    const matchesIndustry =
      industryFilter === "all" || example.industry === industryFilter;
    const matchesRoleLevel =
      roleLevelFilter === "all" || example.role_level === roleLevelFilter;
    const matchesOutcome =
      outcomeFilter === "all" || example.outcome_type === outcomeFilter;

    return matchesSearch && matchesIndustry && matchesRoleLevel && matchesOutcome;
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/examples?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      // Refresh the page
      window.location.reload();
    } catch (err) {
      console.error("Delete failed:", err);
      setDeletingId(null);
    }
  };

  if (examples.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No examples yet
          </h3>
          <p className="text-muted-foreground max-w-sm">
            Upload resume + job description pairs above to start building the training
            database.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job title, company, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry} className="capitalize">
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleLevelFilter} onValueChange={setRoleLevelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {roleLevels.map((level) => (
              <SelectItem key={level} value={level} className="capitalize">
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredExamples.length} of {examples.length} examples
      </p>

      {/* Table */}
      <div className="space-y-3">
        {filteredExamples.map((example) => (
          <Card key={example.id} className="overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === example.id ? null : example.id)
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">
                      {example.job_title || "Untitled Position"}
                    </h3>
                    {example.is_quality_example && (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                      >
                        Quality
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {example.company_name || "Unknown Company"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {example.industry && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {example.industry}
                      </Badge>
                    )}
                    {example.role_level && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {example.role_level}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={
                        example.outcome_type === "positive"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {example.outcome_type === "positive" ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {example.outcome_type}
                    </Badge>
                  </div>
                  {expandedId === example.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded details */}
            {expandedId === example.id && (
              <div className="border-t p-4 bg-muted/30">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Job Description Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Job Description</h4>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {example.job_description}
                    </p>
                  </div>

                  {/* Resume Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Resume</h4>
                    <p className="text-sm text-muted-foreground line-clamp-4">
                      {example.resume_text}
                    </p>
                  </div>
                </div>

                {/* Skills */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {example.required_skills && example.required_skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {example.required_skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs bg-accent/10"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {example.candidate_skills && example.candidate_skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Candidate Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {example.candidate_skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-xs bg-violet-50 text-violet-700"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Meta info */}
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Source: {example.source} | Created:{" "}
                    {new Date(example.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Eye className="h-3 w-3" />
                          View Full
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {example.job_title} at {example.company_name || "Unknown"}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 md:grid-cols-2 mt-4">
                          <div>
                            <h4 className="font-medium mb-2">Job Description</h4>
                            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                              {example.job_description}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Resume</h4>
                            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                              {example.resume_text}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Example</DialogTitle>
                        </DialogHeader>
                        <p className="text-muted-foreground">
                          Are you sure you want to delete this example? This action
                          cannot be undone.
                        </p>
                        <DialogFooter className="gap-2 sm:gap-0">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(example.id)}
                            disabled={deletingId === example.id}
                          >
                            {deletingId === example.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
