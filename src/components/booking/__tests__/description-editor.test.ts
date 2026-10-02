import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DescriptionEditor } from "@/components/booking/DescriptionEditor";

/**
 * Selection, `execCommand` and the link bar need a real browser (jsdom has no
 * `execCommand`), so those behaviours were checked in Chrome. These tests pin
 * what the editor offers: every control exists, is named, and cannot submit the
 * surrounding form.
 */
function render() {
  return renderToStaticMarkup(
    createElement(DescriptionEditor, { value: "", onChange: () => {} }),
  );
}

/** Every <button> in the markup, in order. */
function buttons(html: string) {
  return [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);
}

function labelOf(button: string) {
  return button.match(/aria-label="([^"]*)"/)?.[1] ?? null;
}

describe("DescriptionEditor toolbar", () => {
  const html = render();

  it("is a labelled toolbar", () => {
    expect(html).toContain('role="toolbar"');
    expect(html).toContain('aria-label="Description formatting"');
  });

  it("has separate left, center and right alignment buttons", () => {
    const labels = buttons(html).map(labelOf);
    expect(labels).toContain("Align left");
    expect(labels).toContain("Align center");
    expect(labels).toContain("Align right");
  });

  it("has a link button, plus the text and list buttons it had before", () => {
    const labels = buttons(html).map(labelOf);
    for (const expected of [
      "Bold",
      "Italic",
      "Underline",
      "Bulleted list",
      "Numbered list",
      "Insert link",
    ]) {
      expect(labels, expected).toContain(expected);
    }
  });

  it("lays the buttons out as text, alignment, lists, link", () => {
    expect(buttons(html).map(labelOf)).toEqual([
      "Bold",
      "Italic",
      "Underline",
      "Align left",
      "Align center",
      "Align right",
      "Bulleted list",
      "Numbered list",
      "Insert link",
    ]);
  });

  it("never lets a toolbar button submit the form around the editor", () => {
    for (const button of buttons(html)) {
      expect(button, button).toContain('type="button"');
    }
  });

  it("reports whether each button is on, for screen readers", () => {
    for (const button of buttons(html)) {
      expect(button, button).toContain('aria-pressed="false"');
    }
  });

  it("shows the shortcut for the link button", () => {
    expect(html).toContain('title="Insert link (Ctrl+K)"');
  });

  it("does not open the link bar until asked (no browser prompt either)", () => {
    expect(html).not.toContain('aria-label="Link URL"');
    expect(html).not.toContain('role="alert"');
  });
});

describe("DescriptionEditor text area", () => {
  const html = render();

  it("is an editable, multi-line, named textbox", () => {
    expect(html).toContain('role="textbox"');
    expect(html).toContain('aria-multiline="true"');
    expect(html).toContain('contentEditable="true"');
    expect(html).toContain('aria-label="Description"');
  });

  it("uses the shared rich text styles so lists show bullets and numbers", () => {
    expect(html).toContain("fc-rich-editor");
  });
});
