// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButton } from "../ExportButton";

describe("ExportButton", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────

  it("renders the export button with correct label", () => {
    render(<ExportButton resumeText="Test resume" />);
    expect(screen.getByRole("button", { name: /export resume/i })).toBeTruthy();
    expect(screen.getByText("Export")).toBeTruthy();
  });

  it("renders with aria-haspopup and aria-expanded attributes", () => {
    render(<ExportButton resumeText="Test resume" />);
    const button = screen.getByRole("button", { name: /export resume/i });
    expect(button.getAttribute("aria-haspopup")).toBe("true");
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("is disabled when resumeText is empty", () => {
    render(<ExportButton resumeText="" />);
    const button = screen.getByRole("button", { name: /export resume/i });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  it("is disabled when disabled prop is true", () => {
    render(<ExportButton resumeText="Test resume" disabled={true} />);
    const button = screen.getByRole("button", { name: /export resume/i });
    expect(button.hasAttribute("disabled")).toBe(true);
  });

  // ── Dropdown ───────────────────────────────────────────────────────

  it("opens dropdown menu on click", async () => {
    render(<ExportButton resumeText="Test resume" />);
    const button = screen.getByRole("button", { name: /export resume/i });

    await user.click(button);

    expect(screen.getByRole("menu")).toBeTruthy();
    expect(screen.getByText("Download as PDF")).toBeTruthy();
    expect(screen.getByText("Download as DOCX")).toBeTruthy();
  });

  it("updates aria-expanded when dropdown opens", async () => {
    render(<ExportButton resumeText="Test resume" />);
    const button = screen.getByRole("button", { name: /export resume/i });

    await user.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows format descriptions in dropdown", async () => {
    render(<ExportButton resumeText="Test resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));

    expect(screen.getByText("ATS-friendly PDF format")).toBeTruthy();
    expect(screen.getByText("Editable Word document")).toBeTruthy();
  });

  it("has menuitem roles on dropdown options", async () => {
    render(<ExportButton resumeText="Test resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));

    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(2);
  });

  it("closes dropdown when toggle button clicked again", async () => {
    render(<ExportButton resumeText="Test resume" />);
    const button = screen.getByRole("button", { name: /export resume/i });

    await user.click(button);
    expect(screen.getByRole("menu")).toBeTruthy();

    // Click the toggle button again to close
    await user.click(button);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  // ── Export Flow ────────────────────────────────────────────────────

  it("calls /api/export with PDF format when PDF option clicked", async () => {
    const mockBlob = new Blob(["pdf content"], { type: "application/pdf" });
    const mockResponse = {
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    global.URL.revokeObjectURL = vi.fn();

    render(<ExportButton resumeText="My resume content" analysisId="abc-123" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    expect(global.fetch).toHaveBeenCalledWith("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "My resume content",
        format: "pdf",
        analysisId: "abc-123",
      }),
    });
  });

  it("calls /api/export with DOCX format when DOCX option clicked", async () => {
    const mockBlob = new Blob(["docx content"]);
    const mockResponse = {
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    global.URL.revokeObjectURL = vi.fn();

    render(<ExportButton resumeText="My resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as DOCX"));

    expect(global.fetch).toHaveBeenCalledWith("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "My resume",
        format: "docx",
      }),
    });
  });

  it("does not include analysisId in request when not provided", async () => {
    const mockBlob = new Blob(["content"]);
    const mockResponse = {
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    global.URL.revokeObjectURL = vi.fn();

    render(<ExportButton resumeText="Resume text" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    const callBody = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    );
    expect(callBody).toEqual({ text: "Resume text", format: "pdf" });
    expect(callBody.analysisId).toBeUndefined();
  });

  it("triggers browser download on successful PDF export", async () => {
    const mockBlob = new Blob(["pdf content"], { type: "application/pdf" });
    const mockResponse = {
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:test-url");
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = vi.fn();

    // Track anchor clicks
    const clickSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        el.click = clickSpy;
      }
      return el;
    });

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    // Verify blob URL was created
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);

    // Verify anchor click was triggered (i.e., download was initiated)
    expect(clickSpy).toHaveBeenCalled();
  });

  it("sets correct filename for DOCX export", async () => {
    const mockBlob = new Blob(["docx content"]);
    const mockResponse = {
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse);

    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    global.URL.revokeObjectURL = vi.fn();

    let capturedAnchor: HTMLAnchorElement | null = null;
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        capturedAnchor = el as HTMLAnchorElement;
        el.click = vi.fn();
      }
      return el;
    });

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as DOCX"));

    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.download).toBe("resume.docx");
  });

  // ── Loading State ──────────────────────────────────────────────────

  it("shows loading spinner during PDF export", async () => {
    // Create a promise we control to keep the export "in progress"
    let resolveExport: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    // Button should show loading text
    expect(screen.getByText(/exporting pdf/i)).toBeTruthy();

    // The export button should be disabled during export
    const button = screen.getByRole("button", { name: /export resume/i });
    expect(button.hasAttribute("disabled")).toBe(true);

    // Clean up
    resolveExport!({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
  });

  it("shows loading spinner during DOCX export", async () => {
    let resolveExport: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as DOCX"));

    expect(screen.getByText(/exporting docx/i)).toBeTruthy();

    resolveExport!({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
  });

  // ── Error Handling ─────────────────────────────────────────────────

  it("shows error message when export fails with server error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Export generation failed" }),
    });

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    expect(screen.getByText("Export generation failed")).toBeTruthy();
  });

  it("shows generic error when response has no error message", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    expect(screen.getByText(/export failed/i)).toBeTruthy();
  });

  it("shows error when fetch throws network error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    expect(screen.getByText("Network error")).toBeTruthy();
  });

  it("allows dismissing the error message", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));
    await user.click(screen.getByText("Download as PDF"));

    expect(screen.getByText("Server error")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /dismiss error/i }));
    expect(screen.queryByText("Server error")).toBeNull();
  });

  // ── Dropdown closes after export starts ────────────────────────────

  it("closes dropdown when export format is selected", async () => {
    let resolveExport: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveExport = resolve;
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(pendingPromise);

    render(<ExportButton resumeText="Resume" />);
    await user.click(screen.getByRole("button", { name: /export resume/i }));

    // Dropdown should be open
    expect(screen.getByRole("menu")).toBeTruthy();

    await user.click(screen.getByText("Download as PDF"));

    // Dropdown should be closed now
    expect(screen.queryByRole("menu")).toBeNull();

    resolveExport!({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
  });
});
