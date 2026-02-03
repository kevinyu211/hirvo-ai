/**
 * PDF Generator for Templates
 *
 * Uses @react-pdf/renderer to generate styled PDF documents
 * from structured resume data.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { StructuredResume } from "@/lib/types";
import type { TemplateStyle } from "./types";

/**
 * Generate PDF with the specified template style
 */
export async function generatePDFWithStyle(
  resume: StructuredResume,
  style: TemplateStyle
): Promise<Buffer> {
  const styles = createPDFStyles(style);

  const doc = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View>
          {/* Contact Header */}
          <View style={styles.header}>
            <Text style={styles.name}>{resume.contact.fullName || "Your Name"}</Text>
            <ContactLine
              items={[
                resume.contact.email,
                resume.contact.phone,
                resume.contact.location,
              ]}
              style={styles.contactLine}
            />
            <ContactLine
              items={[
                resume.contact.linkedin,
                resume.contact.github,
                resume.contact.website,
              ]}
              style={styles.contactLinks}
            />
          </View>

          {/* Summary */}
          {resume.summary && (
            <View style={styles.section}>
              <SectionHeader
                title="Summary"
                style={styles}
                features={style.features}
              />
              <Text style={styles.bodyText}>{resume.summary}</Text>
            </View>
          )}

          {/* Experience */}
          {resume.experience.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Experience"
                style={styles}
                features={style.features}
              />
              {resume.experience.map((exp) => (
                <View key={exp.id} style={styles.entry}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.jobTitle}>{exp.title}</Text>
                    <Text style={styles.dates}>
                      {exp.startDate} - {exp.endDate}
                    </Text>
                  </View>
                  <Text style={styles.company}>
                    {exp.company}
                    {exp.location && ` | ${exp.location}`}
                  </Text>
                  {exp.bullets.map((bullet, i) => (
                    <BulletPoint
                      key={i}
                      text={bullet}
                      bulletStyle={style.features.bulletStyle}
                      styles={styles}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Education */}
          {resume.education.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Education"
                style={styles}
                features={style.features}
              />
              {resume.education.map((edu) => (
                <View key={edu.id} style={styles.entry}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.jobTitle}>{edu.school}</Text>
                    <Text style={styles.dates}>{edu.endDate}</Text>
                  </View>
                  <Text style={styles.company}>
                    {edu.degree}
                    {edu.field && ` in ${edu.field}`}
                    {edu.gpa && ` | GPA: ${edu.gpa}`}
                  </Text>
                  {edu.highlights.map((highlight, i) => (
                    <BulletPoint
                      key={i}
                      text={highlight}
                      bulletStyle={style.features.bulletStyle}
                      styles={styles}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Skills */}
          {(resume.skills.technical.length > 0 ||
            resume.skills.tools.length > 0 ||
            resume.skills.soft.length > 0) && (
            <View style={styles.section}>
              <SectionHeader
                title="Skills"
                style={styles}
                features={style.features}
              />
              {resume.skills.technical.length > 0 && (
                <SkillLine
                  label="Technical"
                  skills={resume.skills.technical}
                  styles={styles}
                />
              )}
              {resume.skills.tools.length > 0 && (
                <SkillLine
                  label="Tools"
                  skills={resume.skills.tools}
                  styles={styles}
                />
              )}
              {resume.skills.soft.length > 0 && (
                <SkillLine
                  label="Soft Skills"
                  skills={resume.skills.soft}
                  styles={styles}
                />
              )}
              {resume.skills.languages.length > 0 && (
                <SkillLine
                  label="Languages"
                  skills={resume.skills.languages}
                  styles={styles}
                />
              )}
            </View>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Projects"
                style={styles}
                features={style.features}
              />
              {resume.projects.map((proj) => (
                <View key={proj.id} style={styles.entry}>
                  <Text style={styles.jobTitle}>
                    {proj.name}
                    {proj.url && ` (${proj.url})`}
                  </Text>
                  {proj.technologies.length > 0 && (
                    <Text style={styles.smallText}>
                      Technologies: {proj.technologies.join(", ")}
                    </Text>
                  )}
                  {proj.description && (
                    <Text style={styles.bodyText}>{proj.description}</Text>
                  )}
                  {proj.bullets.map((bullet, i) => (
                    <BulletPoint
                      key={i}
                      text={bullet}
                      bulletStyle={style.features.bulletStyle}
                      styles={styles}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Certifications"
                style={styles}
                features={style.features}
              />
              {resume.certifications.map((cert, i) => (
                <BulletPoint
                  key={i}
                  text={cert}
                  bulletStyle={style.features.bulletStyle}
                  styles={styles}
                />
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}

/**
 * Create stylesheet from template style
 */
function createPDFStyles(style: TemplateStyle) {
  return StyleSheet.create({
    page: {
      paddingTop: style.spacing.page.top,
      paddingBottom: style.spacing.page.bottom,
      paddingLeft: style.spacing.page.left,
      paddingRight: style.spacing.page.right,
      fontFamily: style.typography.fontFamily.body,
      fontSize: style.typography.fontSize.body,
      lineHeight: style.typography.lineHeight,
      color: style.colors.text,
    },
    header: {
      marginBottom: style.spacing.sectionGap,
      textAlign: style.features.nameCenter ? "center" : "left",
    },
    name: {
      fontSize: style.typography.fontSize.name,
      fontFamily: style.typography.fontFamily.heading,
      color: style.colors.heading,
      marginBottom: 4,
    },
    contactLine: {
      fontSize: style.typography.fontSize.small,
      color: style.colors.muted,
      marginBottom: 2,
      textAlign: style.features.contactCenter ? "center" : "left",
    },
    contactLinks: {
      fontSize: style.typography.fontSize.small,
      color: style.colors.secondary,
      textAlign: style.features.contactCenter ? "center" : "left",
    },
    section: {
      marginTop: style.spacing.sectionGap,
    },
    sectionHeading: {
      fontSize: style.typography.fontSize.sectionHeading,
      fontFamily: style.typography.fontFamily.heading,
      color: style.colors.heading,
      marginBottom: 6,
      paddingBottom: style.features.sectionDividers ? 2 : 0,
      borderBottomWidth: style.features.sectionDividers ? 0.5 : 0,
      borderBottomColor: style.colors.border,
    },
    entry: {
      marginBottom: style.spacing.entryGap,
    },
    entryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    jobTitle: {
      fontSize: style.typography.fontSize.jobTitle,
      fontFamily: style.typography.fontFamily.heading,
      color: style.colors.heading,
    },
    dates: {
      fontSize: style.typography.fontSize.small,
      color: style.colors.muted,
    },
    company: {
      fontSize: style.typography.fontSize.company,
      color: style.colors.secondary,
      marginBottom: 4,
    },
    bodyText: {
      fontSize: style.typography.fontSize.body,
      color: style.colors.text,
      marginBottom: 3,
    },
    bulletText: {
      fontSize: style.typography.fontSize.body,
      color: style.colors.text,
      paddingLeft: style.spacing.bulletIndent,
      marginBottom: 2,
    },
    smallText: {
      fontSize: style.typography.fontSize.small,
      color: style.colors.muted,
      marginBottom: 2,
    },
    skillLine: {
      fontSize: style.typography.fontSize.body,
      color: style.colors.text,
      marginBottom: 3,
    },
    skillLabel: {
      fontFamily: style.typography.fontFamily.heading,
    },
  });
}

/**
 * Contact line component
 */
function ContactLine({
  items,
  style,
}: {
  items: (string | undefined)[];
  style: ReturnType<typeof StyleSheet.create>[string];
}) {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return null;
  return <Text style={style}>{filtered.join(" | ")}</Text>;
}

/**
 * Section header component
 */
function SectionHeader({
  title,
  style,
  features,
}: {
  title: string;
  style: ReturnType<typeof createPDFStyles>;
  features: TemplateStyle["features"];
}) {
  const displayTitle = features.sectionUppercase ? title.toUpperCase() : title;
  return <Text style={style.sectionHeading}>{displayTitle}</Text>;
}

/**
 * Bullet point component
 */
function BulletPoint({
  text,
  bulletStyle,
  styles,
}: {
  text: string;
  bulletStyle: string;
  styles: ReturnType<typeof createPDFStyles>;
}) {
  const bulletChar =
    bulletStyle === "arrow"
      ? "\u2192 "
      : bulletStyle === "dash"
        ? "- "
        : bulletStyle === "none"
          ? ""
          : "\u2022 ";
  return <Text style={styles.bulletText}>{bulletChar}{text}</Text>;
}

/**
 * Skill line component
 */
function SkillLine({
  label,
  skills,
  styles,
}: {
  label: string;
  skills: string[];
  styles: ReturnType<typeof createPDFStyles>;
}) {
  return (
    <Text style={styles.skillLine}>
      <Text style={styles.skillLabel}>{label}: </Text>
      {skills.join(", ")}
    </Text>
  );
}
