import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationEditModal } from "@/components/booking/BookingNotificationsStep";
import {
  DEFAULT_NOTIFICATIONS,
  type NotificationRow,
  type NotifyChannel,
} from "@/lib/booking/notify-prefs";

const confirmed = DEFAULT_NOTIFICATIONS.find((row) => row.id === "confirmed")!;

function render(channels?: NotifyChannel[]) {
  return renderToStaticMarkup(
    createElement(NotificationEditModal, {
      row: confirmed,
      channels,
      onClose: () => {},
      onSave: () => {},
    }),
  );
}

function tabLabels(html: string) {
  // The tab strip is the only place a channel name is a bare <button> label.
  return (["Email", "In-app", "SMS", "WhatsApp"] as const).filter((label) =>
    html.includes(`>${label}</button>`),
  );
}

describe("NotificationEditModal tabs", () => {
  it("offers only Email by default — no In-app, SMS or WhatsApp tab", () => {
    const html = render();
    expect(tabLabels(html)).toEqual(["Email"]);
  });

  it("still shows the full Email editor", () => {
    const html = render();
    expect(html).toContain("Edit Appointment booked (Status: Confirmed)");
    expect(html).toContain("Subject");
    expect(html).toContain("Email body");
    expect(html).toContain("Test email");
    expect(html).toContain("Send test email");
    expect(html).toContain("Enabled");
    expect(html).toContain(">Save<");
    expect(html).toContain(">Cancel<");
  });

  it("does not render the SMS, in-app or WhatsApp editors by default", () => {
    const html = render();
    expect(html).not.toContain("SMS message");
    expect(html).not.toContain("Send test SMS");
    expect(html).not.toContain("Send test in-app");
    expect(html).not.toContain("Send test WhatsApp");
  });

  it("the Enabled switch follows the Email channel", () => {
    expect(confirmed.channels.Email).toBe(true);
    expect(render()).toContain('aria-checked="true"');
  });

  it("the SMS panel can open the editor on SMS alone", () => {
    const html = render(["SMS"]);
    expect(tabLabels(html)).toEqual(["SMS"]);
    expect(html).toContain("SMS message");
    expect(html).not.toContain("Email body");
  });

  it("the WhatsApp panel can open the editor on WhatsApp alone", () => {
    const html = render(["WhatsApp"]);
    expect(tabLabels(html)).toEqual(["WhatsApp"]);
    expect(html).toContain("Send test WhatsApp");
  });

  it("falls back to Email when given no channels", () => {
    expect(tabLabels(render([]))).toEqual(["Email"]);
  });
});

describe("NotificationEditModal email tools", () => {
  it("has an Insert Variable button on both Subject and Email body", () => {
    const html = render();
    expect(html.match(/>\s*Insert Variable\s*</g) ?? []).toHaveLength(2);
    expect(html).toContain('aria-haspopup="menu"');
    // The menu itself only exists once opened.
    expect(html).not.toContain('role="menu"');
  });

  it("labels Subject and Email body so clicking the label focuses the field", () => {
    const html = render();
    expect(html).toMatch(/<label for="[^"]+"[^>]*>Subject/);
    expect(html).toMatch(/<label for="[^"]+"[^>]*>Email body/);
  });

  it("shows the date format picker, defaulting to dd-MMM-yyyy with a live preview", () => {
    const html = render();
    expect(html).toContain("Select Date Format For Mail:");
    expect(html).toContain('aria-label="Select date format for mail"');
    expect(html).toMatch(/dd-MMM-yyyy \(\d{2}-[A-Z][a-z]{2}-\d{4}\)/);
  });

  it("shows the saved date format when the notification has one", () => {
    const html = renderToStaticMarkup(
      createElement(NotificationEditModal, {
        row: { ...confirmed, dateFormat: "MM.dd.yy" },
        onClose: () => {},
        onSave: () => {},
      }),
    );
    expect(html).toMatch(/MM\.dd\.yy \(\d{2}\.\d{2}\.\d{2}\)/);
  });

  it("keeps the email tools off the SMS editor", () => {
    const html = render(["SMS"]);
    expect(html).not.toContain("Insert Variable");
    expect(html).not.toContain("Select Date Format For Mail:");
  });
});

/** Where things sit in the markup is the layout: reading order is top to bottom. */
describe("NotificationEditModal layout", () => {
  const html = render();
  const subjectAt = html.search(/<label for="[^"]+"[^>]*>Subject/);
  const bodyAt = html.search(/<label for="[^"]+"[^>]*>Email body/);
  const textareaAt = html.indexOf("<textarea");
  const inserts = [...html.matchAll(/>\s*Insert Variable\s*</g)].map((m) => m.index!);

  it("is a labelled dialog", () => {
    const labelledBy = html.match(/role="dialog"[^>]*aria-labelledby="([^"]+)"/)?.[1];
    expect(html).toContain('aria-modal="true"');
    expect(labelledBy).toBeTruthy();
    expect(html).toContain(`<h2 id="${labelledBy}"`);
  });

  it("says when the notification is sent right under the title", () => {
    expect(html.indexOf(confirmed.info)).toBeGreaterThan(html.indexOf("<h2"));
    expect(html.indexOf(confirmed.info)).toBeLessThan(html.indexOf(">Email</button>"));
  });

  it("has an accessible Close button for the X", () => {
    expect(html).toMatch(/<button[^>]*aria-label="Close"/);
  });

  it("puts one Insert Variable inside the Subject field, ahead of the Email body", () => {
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toBeGreaterThan(subjectAt);
    expect(inserts[0]).toBeLessThan(bodyAt);
  });

  it("puts the other Insert Variable on the editor toolbar, with Reset to default, above the text", () => {
    const resetAt = html.indexOf("Reset to default");
    expect(resetAt).toBeGreaterThan(bodyAt);
    expect(resetAt).toBeLessThan(inserts[1]);
    expect(inserts[1]).toBeLessThan(textareaAt);
  });

  it("puts the date format on the Email body row, above the editor", () => {
    const dateAt = html.indexOf("Select Date Format For Mail:");
    expect(dateAt).toBeGreaterThan(bodyAt);
    expect(dateAt).toBeLessThan(html.indexOf("Reset to default"));
  });

  it("counts characters and words under the editor", () => {
    expect(html).toMatch(/\d+ characters \| \d+ words/);
    expect(html.search(/\d+ characters \| \d+ words/)).toBeGreaterThan(textareaAt);
  });

  it("shows Save first and Cancel after it at the bottom", () => {
    const save = html.lastIndexOf(">Save<");
    const cancel = html.lastIndexOf(">Cancel<");
    expect(save).toBeGreaterThan(html.indexOf("Send test email"));
    expect(cancel).toBeGreaterThan(save);
  });

  it("no longer hides the message inside a Contact accordion", () => {
    expect(html).not.toContain("Who should receive this notification?");
  });

  it("has no Send to row — recipients are not chosen in this window", () => {
    expect(html).not.toContain("Send to");
    expect(html).not.toContain("Assigned user");
    expect(html).not.toContain('type="checkbox"');
  });
});

describe("NotificationEditModal recipients", () => {
  function renderFor(
    who: Partial<Pick<NotificationRow, "notifyContact" | "notifyUser">>,
    channels?: NotifyChannel[],
  ) {
    return renderToStaticMarkup(
      createElement(NotificationEditModal, {
        row: { ...confirmed, ...who },
        channels,
        onClose: () => {},
        onSave: () => {},
      }),
    );
  }

  const everyone: Array<Parameters<typeof renderFor>[0]> = [
    { notifyContact: true, notifyUser: false },
    { notifyContact: false, notifyUser: true },
    { notifyContact: true, notifyUser: true },
    { notifyContact: false, notifyUser: false },
  ];

  it("shows no recipient checkboxes, whoever the notification is set to reach", () => {
    for (const who of everyone) {
      const html = renderFor(who);
      expect(html).not.toContain("Send to");
      expect(html).not.toContain("Assigned user");
      expect(html.match(/type="checkbox"/g) ?? []).toHaveLength(0);
    }
  });

  it("always shows the Email editor — it is never locked behind a tick", () => {
    for (const who of everyone) {
      const html = renderFor(who);
      expect(html).toContain("Email body");
      expect(html).toContain("Send test email");
      expect(html).not.toContain("above to write this message");
    }
  });

  it("always shows the SMS editor", () => {
    for (const who of everyone) {
      const html = renderFor(who, ["SMS"]);
      expect(html).toContain("SMS message");
      expect(html).toContain("Send test SMS");
    }
  });

  it("always offers the WhatsApp and in-app tests", () => {
    for (const who of everyone) {
      expect(renderFor(who, ["WhatsApp"])).toContain("Send test WhatsApp");
      expect(renderFor(who, ["In-app"])).toContain("Send test in-app");
    }
  });
});
