"use client";

import { useCallback, useMemo, useState } from "react";
import type { StructuredResume, Suggestion, MergedSectionFeedback, ATSScore, HRScore, GrammarlyFix } from "@/lib/types";
import { ContactDisplay } from "./ContactDisplay";
import { ExperienceDisplay } from "./ExperienceDisplay";
import { EducationDisplay } from "./EducationDisplay";
import { SkillsDisplay } from "./SkillsDisplay";
import { ResumeSection } from "./ResumeSection";
import { EditableField } from "./EditableField";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectEntry } from "@/lib/types";

export interface StructuredResumeEditorProps {
  /** The structured resume to display and edit */
  resume: StructuredResume;
  /** Called when the resume is modified */
  onChange: (resume: StructuredResume) => void;
  /** Optional suggestions to highlight issues */
  suggestions?: Suggestion[];
  /** Called when a suggestion is clicked */
  onSuggestionClick?: (suggestion: Suggestion) => void;
  /** Whether editing is disabled */
  readOnly?: boolean;
  /** Optional section visibility overrides */
  sectionVisibility?: Record<string, boolean>;
  /** Called when section visibility changes */
  onSectionVisibilityChange?: (section: string, visible: boolean) => void;
  /** Section feedback map for ATS/HR dropdowns */
  sectionFeedback?: Map<string, MergedSectionFeedback>;
  /** ATS score for detailed section analysis */
  atsScore?: ATSScore | null;
  /** HR score for detailed section analysis */
  hrScore?: HRScore | null;
  /** Callback when a Grammarly-style fix is accepted */
  onAcceptFix?: (fix: GrammarlyFix) => void;
}

/**
 * Structured Resume Editor - Displays resume content in a clean,
 * organized template with inline editing capabilities and
 * section-level ATS/HR feedback.
 */
export function StructuredResumeEditor({
  resume,
  onChange,
  suggestions = [],
  onSuggestionClick,
  readOnly = false,
  sectionVisibility,
  onSectionVisibilityChange,
  sectionFeedback,
  atsScore,
  hrScore,
  onAcceptFix,
}: StructuredResumeEditorProps) {
  // Track which feedback sections are expanded
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());

  const toggleFeedback = useCallback((sectionKey: string) => {
    setExpandedFeedback((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) {
        next.delete(sectionKey);
      } else {
        next.add(sectionKey);
      }
      return next;
    });
  }, []);

  // Section visibility with defaults
  const getVisibility = (section: string): boolean => {
    if (sectionVisibility && section in sectionVisibility) {
      return sectionVisibility[section];
    }
    // Default visibility based on content presence
    switch (section) {
      case "summary":
        return !!resume.summary;
      case "projects":
        return !!resume.projects && resume.projects.length > 0;
      case "certifications":
        return !!resume.certifications && resume.certifications.length > 0;
      default:
        return true;
    }
  };

  const handleVisibilityChange = (section: string, visible: boolean) => {
    onSectionVisibilityChange?.(section, visible);
  };

  // Update handlers
  const updateContact = useCallback(
    (contact: StructuredResume["contact"]) => {
      onChange({ ...resume, contact });
    },
    [resume, onChange]
  );

  const updateSummary = useCallback(
    (summary: string) => {
      onChange({ ...resume, summary: summary || undefined });
    },
    [resume, onChange]
  );

  const updateExperience = useCallback(
    (experience: StructuredResume["experience"]) => {
      onChange({ ...resume, experience });
    },
    [resume, onChange]
  );

  const updateEducation = useCallback(
    (education: StructuredResume["education"]) => {
      onChange({ ...resume, education });
    },
    [resume, onChange]
  );

  const updateSkills = useCallback(
    (skills: StructuredResume["skills"]) => {
      onChange({ ...resume, skills });
    },
    [resume, onChange]
  );

  const updateProjects = useCallback(
    (projects: ProjectEntry[]) => {
      onChange({ ...resume, projects: projects.length > 0 ? projects : undefined });
    },
    [resume, onChange]
  );

  const updateCertifications = useCallback(
    (certifications: string[]) => {
      onChange({
        ...resume,
        certifications: certifications.length > 0 ? certifications : undefined,
      });
    },
    [resume, onChange]
  );

  // Add project entry
  const addProject = useCallback(() => {
    const newProject: ProjectEntry = {
      id: `proj-${Date.now()}`,
      name: "",
      technologies: [],
      bullets: [""],
    };
    onChange({
      ...resume,
      projects: [...(resume.projects || []), newProject],
    });
  }, [resume, onChange]);

  // Update single project
  const updateProject = useCallback(
    (index: number, project: ProjectEntry) => {
      const projects = [...(resume.projects || [])];
      projects[index] = project;
      onChange({ ...resume, projects });
    },
    [resume, onChange]
  );

  // Delete project
  const deleteProject = useCallback(
    (index: number) => {
      const projects = (resume.projects || []).filter((_, i) => i !== index);
      onChange({ ...resume, projects: projects.length > 0 ? projects : undefined });
    },
    [resume, onChange]
  );

  // Add certification
  const addCertification = useCallback(() => {
    onChange({
      ...resume,
      certifications: [...(resume.certifications || []), ""],
    });
  }, [resume, onChange]);

  // Update certification
  const updateCertification = useCallback(
    (index: number, value: string) => {
      const certifications = [...(resume.certifications || [])];
      certifications[index] = value;
      onChange({ ...resume, certifications });
    },
    [resume, onChange]
  );

  // Delete certification
  const deleteCertification = useCallback(
    (index: number) => {
      const certifications = (resume.certifications || []).filter(
        (_, i) => i !== index
      );
      onChange({
        ...resume,
        certifications: certifications.length > 0 ? certifications : undefined,
      });
    },
    [resume, onChange]
  );

  // Get feedback for a section
  const getFeedback = (sectionKey: string) => sectionFeedback?.get(sectionKey);

  return (
    <div className="space-y-4">
      {/* Contact Section */}
      <ContactDisplay
        contact={resume.contact}
        onChange={updateContact}
        readOnly={readOnly}
      />

      {/* Summary Section (Optional) */}
      <ResumeSection
        title="Summary"
        optional
        isVisible={getVisibility("summary")}
        onVisibilityChange={(v) => handleVisibilityChange("summary", v)}
        collapsible
        sectionFeedback={getFeedback("summary")}
        feedbackExpanded={expandedFeedback.has("summary")}
        onFeedbackToggle={() => toggleFeedback("summary")}
        atsScore={atsScore}
        hrScore={hrScore}
        sectionContent={resume.summary || ""}
        onAcceptFix={onAcceptFix}
      >
        <EditableField
          value={resume.summary || ""}
          onChange={updateSummary}
          placeholder="Write a brief professional summary highlighting your key strengths and career objectives..."
          readOnly={readOnly}
          variant="body"
          multiline
        />
      </ResumeSection>

      {/* Experience Section */}
      <ExperienceDisplay
        entries={resume.experience}
        onChange={updateExperience}
        readOnly={readOnly}
        sectionFeedbackMap={sectionFeedback}
        atsScore={atsScore}
        hrScore={hrScore}
        onAcceptFix={onAcceptFix}
      />

      {/* Education Section */}
      <EducationDisplay
        entries={resume.education}
        onChange={updateEducation}
        readOnly={readOnly}
      />

      {/* Skills Section */}
      <SkillsDisplay
        skills={resume.skills}
        onChange={updateSkills}
        readOnly={readOnly}
      />

      {/* Projects Section (Optional) */}
      <ResumeSection
        title="Projects"
        optional
        isVisible={getVisibility("projects")}
        onVisibilityChange={(v) => handleVisibilityChange("projects", v)}
        collapsible
        sectionFeedback={getFeedback("projects")}
        feedbackExpanded={expandedFeedback.has("projects")}
        onFeedbackToggle={() => toggleFeedback("projects")}
        atsScore={atsScore}
        hrScore={hrScore}
        sectionContent={(resume.projects || []).map((p) => `${p.name} ${p.bullets.join(" ")}`).join(" ")}
        onAcceptFix={onAcceptFix}
      >
        <div className="space-y-4">
          {(resume.projects || []).map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              onChange={(p) => updateProject(index, p)}
              onDelete={() => deleteProject(index)}
              readOnly={readOnly}
            />
          ))}

          {(!resume.projects || resume.projects.length === 0) && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No projects yet
            </p>
          )}

          {!readOnly && (
            <Button variant="outline" className="w-full" onClick={addProject}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>
      </ResumeSection>

      {/* Certifications Section (Optional) */}
      <ResumeSection
        title="Certifications"
        optional
        isVisible={getVisibility("certifications")}
        onVisibilityChange={(v) => handleVisibilityChange("certifications", v)}
        collapsible
        sectionFeedback={getFeedback("certifications")}
        feedbackExpanded={expandedFeedback.has("certifications")}
        onFeedbackToggle={() => toggleFeedback("certifications")}
        atsScore={atsScore}
        hrScore={hrScore}
        sectionContent={(resume.certifications || []).join(" ")}
        onAcceptFix={onAcceptFix}
      >
        <div className="space-y-2">
          {(resume.certifications || []).map((cert, index) => (
            <div key={index} className="flex items-center gap-2 group">
              <span className="text-muted-foreground">•</span>
              <EditableField
                value={cert}
                onChange={(v) => updateCertification(index, v)}
                placeholder="Certification name..."
                readOnly={readOnly}
                variant="body"
                className="flex-1"
              />
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteCertification(index)}
                  aria-label="Remove certification"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}

          {(!resume.certifications || resume.certifications.length === 0) && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No certifications yet
            </p>
          )}

          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={addCertification}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add certification
            </Button>
          )}
        </div>
      </ResumeSection>
    </div>
  );
}

// Project Card subcomponent
interface ProjectCardProps {
  project: ProjectEntry;
  onChange: (project: ProjectEntry) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

function ProjectCard({
  project,
  onChange,
  onDelete,
  readOnly,
}: ProjectCardProps) {
  const updateField = (
    field: keyof ProjectEntry,
    value: string | string[]
  ) => {
    onChange({ ...project, [field]: value });
  };

  const updateBullet = (index: number, value: string) => {
    const newBullets = [...project.bullets];
    newBullets[index] = value;
    updateField("bullets", newBullets);
  };

  const addBullet = () => {
    updateField("bullets", [...project.bullets, ""]);
  };

  const removeBullet = (index: number) => {
    const newBullets = project.bullets.filter((_, i) => i !== index);
    updateField("bullets", newBullets);
  };

  return (
    <div className="relative rounded-lg border bg-background p-4 group">
      {!readOnly && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
          aria-label="Delete project"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}

      <EditableField
        value={project.name}
        onChange={(v) => updateField("name", v)}
        placeholder="Project Name"
        readOnly={readOnly}
        variant="subheading"
        className="mb-1"
      />

      {(project.url || !readOnly) && (
        <EditableField
          value={project.url || ""}
          onChange={(v) => updateField("url", v)}
          placeholder="Project URL (optional)"
          readOnly={readOnly}
          variant="body"
          className="text-muted-foreground mb-2"
        />
      )}

      {(project.description || !readOnly) && (
        <EditableField
          value={project.description || ""}
          onChange={(v) => updateField("description", v)}
          placeholder="Brief description..."
          readOnly={readOnly}
          variant="body"
          className="mb-2"
        />
      )}

      {/* Technologies */}
      <div className="flex flex-wrap gap-1 mb-3">
        {project.technologies.map((tech, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {tech}
          </Badge>
        ))}
      </div>

      {/* Bullets */}
      <div className="space-y-1">
        {project.bullets.map((bullet, index) => (
          <div key={index} className="flex items-start gap-2 group/bullet">
            <span className="text-muted-foreground mt-1">•</span>
            <EditableField
              value={bullet}
              onChange={(v) => updateBullet(index, v)}
              placeholder="Describe your contribution..."
              readOnly={readOnly}
              variant="body"
              className="flex-1"
            />
            {!readOnly && project.bullets.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover/bullet:opacity-100 transition-opacity"
                onClick={() => removeBullet(index)}
                aria-label="Remove bullet"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}

        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-muted-foreground hover:text-foreground"
            onClick={addBullet}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add bullet point
          </Button>
        )}
      </div>
    </div>
  );
}

export default StructuredResumeEditor;
