"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Check, AlertTriangle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface CategoryAccordionProps {
  title: string;
  icon: LucideIcon;
  issueCount: number;
  passCount: number;
  status: "pass" | "warning" | "fail";
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Expandable accordion for each category (Keywords, Formatting, etc.)
 */
export function CategoryAccordion({
  title,
  icon: Icon,
  issueCount,
  passCount,
  status,
  children,
  defaultOpen = false,
  className,
}: CategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getStatusColor = () => {
    switch (status) {
      case "pass":
        return "text-emerald-600 dark:text-emerald-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "fail":
        return "text-red-600 dark:text-red-400";
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case "pass":
        return "bg-emerald-50 dark:bg-emerald-950/30";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/30";
      case "fail":
        return "bg-red-50 dark:bg-red-950/30";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pass":
        return <Check className="h-3.5 w-3.5" />;
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case "fail":
        return <X className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
            "hover:bg-muted/50 text-left",
            isOpen && getStatusBg()
          )}
        >
          {/* Status indicator */}
          <div
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full",
              getStatusBg(),
              getStatusColor()
            )}
          >
            {getStatusIcon()}
          </div>

          {/* Icon */}
          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {/* Title */}
          <span className="flex-1 text-sm font-medium text-foreground">
            {title}
          </span>

          {/* Counts */}
          <div className="flex items-center gap-1.5 mr-2">
            {passCount > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {passCount} <Check className="inline h-3 w-3" />
              </span>
            )}
            {issueCount > 0 && (
              <span
                className={cn(
                  "text-xs",
                  status === "fail"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {issueCount} {status === "fail" ? <X className="inline h-3 w-3" /> : <AlertTriangle className="inline h-3 w-3" />}
              </span>
            )}
          </div>

          {/* Expand icon */}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-7 mt-1 pl-2 border-l-2 border-muted">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
