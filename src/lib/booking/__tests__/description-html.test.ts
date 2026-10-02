import { describe, expect, it } from "vitest";
import {
  buildLinkHtml,
  cleanDescriptionHtml,
  normalizeLinkUrl,
  sanitizeDescriptionHtml,
} from "@/lib/booking/description-html";

describe("normalizeLinkUrl", () => {
  it("adds https:// to a bare address", () => {
    expect(normalizeLinkUrl("google.com")).toBe("https://google.com");
    expect(normalizeLinkUrl("www.example.com/path?x=1#top")).toBe(
      "https://www.example.com/path?x=1#top",
    );
    expect(normalizeLinkUrl("  example.com  ")).toBe("https://example.com");
  });

  it("keeps full web addresses exactly as typed", () => {
    expect(normalizeLinkUrl("https://example.com/a?b=c")).toBe("https://example.com/a?b=c");
    expect(normalizeLinkUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeLinkUrl("HTTPS://EXAMPLE.COM")).toBe("HTTPS://EXAMPLE.COM");
    expect(normalizeLinkUrl("//example.com/x")).toBe("https://example.com/x");
  });

  it("accepts hosts with a port", () => {
    expect(normalizeLinkUrl("localhost:3000")).toBe("https://localhost:3000");
    expect(normalizeLinkUrl("example.com:8080/x")).toBe("https://example.com:8080/x");
  });

  it("turns an email address into a mailto link", () => {
    expect(normalizeLinkUrl("me@site.com")).toBe("mailto:me@site.com");
    expect(normalizeLinkUrl("mailto:me@site.com")).toBe("mailto:me@site.com");
    expect(normalizeLinkUrl("mailto:me@site.com?subject=Hi")).toBe(
      "mailto:me@site.com?subject=Hi",
    );
  });

  it("accepts phone links", () => {
    expect(normalizeLinkUrl("tel:+61400000000")).toBe("tel:+61400000000");
    expect(normalizeLinkUrl("tel:(02)9999-0000")).toBe("tel:(02)9999-0000");
  });

  it("refuses links that would run code or are not links", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.com",
      "blob:https://example.com/x",
    ]) {
      expect(normalizeLinkUrl(bad), bad).toBeNull();
    }
  });

  it("refuses text that is not an address", () => {
    for (const bad of [
      "",
      "   ",
      "hello",
      "hello world",
      "https://hello",
      "https://",
      "mailto:",
      "mailto:nobody",
      "tel:abc",
      'https://example.com/"onmouseover="x',
      "https://example.com/<b>",
      "a b.com",
    ]) {
      expect(normalizeLinkUrl(bad), bad).toBeNull();
    }
  });
});

describe("buildLinkHtml", () => {
  it("opens in a new tab without access to this page", () => {
    expect(buildLinkHtml("https://example.com/", "Example")).toBe(
      '<a href="https://example.com/" target="_blank" rel="noopener noreferrer">Example</a>',
    );
  });

  it("escapes the text and the address", () => {
    expect(buildLinkHtml("https://example.com/?a=1&b=2", "<b>x</b> & y")).toBe(
      '<a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">&lt;b&gt;x&lt;/b&gt; &amp; y</a>',
    );
  });
});

describe("sanitizeDescriptionHtml keeps what the editor makes", () => {
  it("keeps text styling, lists and line breaks", () => {
    const html =
      "<p>Hi <b>there</b>, <i>you</i> <u>all</u></p><ul><li>One</li><li>Two</li></ul><ol><li>A</li></ol>line<br>break";
    expect(sanitizeDescriptionHtml(html)).toBe(html);
  });

  it("keeps alignment, from style or the old align attribute", () => {
    expect(sanitizeDescriptionHtml('<div style="text-align: center;">hello</div>')).toBe(
      '<div style="text-align:center">hello</div>',
    );
    expect(sanitizeDescriptionHtml('<div style="TEXT-ALIGN:RIGHT">x</div>')).toBe(
      '<div style="text-align:right">x</div>',
    );
    expect(sanitizeDescriptionHtml('<p align="center">x</p>')).toBe(
      '<p style="text-align:center">x</p>',
    );
    expect(sanitizeDescriptionHtml('<li style="text-align:left">x</li>')).toBe(
      '<li style="text-align:left">x</li>',
    );
  });

  it("keeps only the alignment from a style", () => {
    expect(
      sanitizeDescriptionHtml(
        '<div style="color:red; background:url(javascript:x); text-align:center; position:fixed">x</div>',
      ),
    ).toBe('<div style="text-align:center">x</div>');
    expect(sanitizeDescriptionHtml('<div style="color:red">x</div>')).toBe("<div>x</div>");
    expect(sanitizeDescriptionHtml('<div style="text-align:bogus">x</div>')).toBe("<div>x</div>");
  });

  it("keeps links and makes them open safely in a new tab", () => {
    expect(sanitizeDescriptionHtml('<a href="https://example.com/a?b=1&amp;c=2">Go</a>')).toBe(
      '<a href="https://example.com/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Go</a>',
    );
    expect(sanitizeDescriptionHtml('<a href="mailto:me@site.com">Mail</a>')).toContain(
      'href="mailto:me@site.com"',
    );
  });

  it("overrides a link's own target and rel", () => {
    expect(
      sanitizeDescriptionHtml('<a href="https://x.com" target="_self" rel="opener">x</a>'),
    ).toBe('<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>');
  });

  it("leaves plain text alone", () => {
    expect(sanitizeDescriptionHtml("A quick 30 minute chat")).toBe("A quick 30 minute chat");
    expect(sanitizeDescriptionHtml("")).toBe("");
  });

  it("does not touch the editor's own output when it is run again", () => {
    const once = sanitizeDescriptionHtml(
      '<div style="text-align:center"><a href="google.com">x</a> <b>y</b></div>',
    );
    expect(sanitizeDescriptionHtml(once)).toBe(once);
  });
});

describe("sanitizeDescriptionHtml removes anything that could run", () => {
  it("drops scripts and their contents", () => {
    expect(sanitizeDescriptionHtml("a<script>alert(1)</script>b")).toBe("ab");
    expect(sanitizeDescriptionHtml("a<SCRIPT src=x>alert(1)</SCRIPT>b")).toBe("ab");
    expect(sanitizeDescriptionHtml("a<style>body{display:none}</style>b")).toBe("ab");
    expect(sanitizeDescriptionHtml('a<iframe src="https://evil.com"></iframe>b')).toBe("ab");
    expect(sanitizeDescriptionHtml("a<svg><script>x</script></svg>b")).toBe("ab");
  });

  it("drops event handlers and unknown attributes", () => {
    expect(sanitizeDescriptionHtml('<b onclick="alert(1)" id="x" class="y">b</b>')).toBe("<b>b</b>");
    expect(sanitizeDescriptionHtml("<p onmouseover=alert(1)>x</p>")).toBe("<p>x</p>");
    expect(sanitizeDescriptionHtml('<a href="https://x.com" onclick="alert(1)">x</a>')).not.toMatch(
      /onclick/i,
    );
  });

  it("drops tags that are not allowed but keeps their text", () => {
    expect(sanitizeDescriptionHtml('<img src=x onerror="alert(1)">hi')).toBe("hi");
    expect(sanitizeDescriptionHtml("<h1>Title</h1><font color=red>x</font>")).toBe("Titlex");
    expect(sanitizeDescriptionHtml('<form action="/x"><input name="a">go</form>')).toBe("go");
  });

  it("keeps javascript: links out, in every spelling", () => {
    for (const href of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "java&#115;cript:alert(1)",
      "java&#x73;cript:alert(1)",
      "java&Tab;script:alert(1)",
      "java&colon;script:alert(1)",
      "javascript&colon;alert(1)",
      "&#106;avascript:alert(1)",
      " javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
    ]) {
      const out = sanitizeDescriptionHtml(`<a href="${href}">x</a>`);
      expect(out, href).toBe("<a>x</a>");
    }
  });

  it("cannot be broken out of with quotes in a link", () => {
    const out = sanitizeDescriptionHtml(
      '<a href=\'https://x.com/"onmouseover="alert(1)\'>x</a>',
    );
    expect(out).toBe("<a>x</a>");
  });

  it("treats a stray < as text", () => {
    expect(sanitizeDescriptionHtml("1 < 2 and <3")).toBe("1 &lt; 2 and &lt;3");
    expect(sanitizeDescriptionHtml('<a href="x')).toBe("&lt;a href=\"x");
    expect(sanitizeDescriptionHtml("<<script>alert(1)</script>")).toBe("&lt;");
  });

  it("removes comments and doctype/processing noise", () => {
    expect(sanitizeDescriptionHtml("a<!-- <script>x</script> -->b")).toBe("ab");
    expect(sanitizeDescriptionHtml("<!DOCTYPE html><?xml version='1.0'?>hi")).toBe("hi");
  });

  it("balances tags so nothing leaks out of its container", () => {
    expect(sanitizeDescriptionHtml("<div><b>x")).toBe("<div><b>x</b></div>");
    expect(sanitizeDescriptionHtml("x</div></b>")).toBe("x");
    expect(sanitizeDescriptionHtml("<b><i>x</b>y")).toBe("<b><i>x</i></b>y");
    expect(sanitizeDescriptionHtml("a</br>b")).toBe("ab");
  });

  it("handles an unclosed script, comment or declaration the way a browser does", () => {
    // Everything after them is theirs, so it goes too.
    expect(sanitizeDescriptionHtml("safe<script>alert(1)")).toBe("safe");
    expect(sanitizeDescriptionHtml("safe<!-- never closed <b>x</b>")).toBe("safe");
    expect(sanitizeDescriptionHtml("safe<!never closed")).toBe("safe");
    expect(sanitizeDescriptionHtml("safe<iframe src=x>rest <b>x</b>")).toBe("safe");
  });

  it("does not hang on hostile input", () => {
    // Each of these used to make every "<" rescan the whole rest of the text.
    const hostile = [
      "<a " + 'x="'.repeat(20000),
      "<".repeat(50000),
      "<div ".repeat(20000),
      "<div ".repeat(20000) + ">",
      "<script ".repeat(20000),
      "<!--".repeat(20000),
      "<!".repeat(20000),
      '<a href="'.repeat(20000),
      "<div>".repeat(20000) + "</i>".repeat(20000),
      "<b>".repeat(20000),
      "&#".repeat(30000),
      "<svg>".repeat(20000),
    ];
    for (const input of hostile) {
      const started = Date.now();
      sanitizeDescriptionHtml(input);
      cleanDescriptionHtml(input);
      expect(Date.now() - started, input.slice(0, 20)).toBeLessThan(1000);
    }
  });

  it("limits how deeply tags nest", () => {
    const out = sanitizeDescriptionHtml("<div>".repeat(1000) + "x" + "</div>".repeat(1000));
    expect(out.match(/<div>/g)?.length).toBeLessThanOrEqual(200);
    expect(out).toContain("x");
  });
});

describe("cleanDescriptionHtml", () => {
  it("empties a description that only has blank markup", () => {
    for (const blank of ["", "  ", "<br>", "<div><br></div>", "<p>&nbsp;</p>", "<b></b>", "<ul><li><br></li></ul>"]) {
      expect(cleanDescriptionHtml(blank), JSON.stringify(blank)).toBe("");
    }
  });

  it("keeps a real description, sanitized", () => {
    expect(cleanDescriptionHtml('  <div style="text-align:center">Hello</div><script>x</script> ')).toBe(
      '<div style="text-align:center">Hello</div>',
    );
  });

  it("keeps a description that is only a link", () => {
    expect(cleanDescriptionHtml('<a href="https://x.com">https://x.com</a>')).toContain("https://x.com");
  });
});
