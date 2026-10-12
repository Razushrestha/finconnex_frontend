import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ZoomAutoCreateOption } from "@/components/activities/meetings/create/MeetingFormCard";
import type { ZoomConnectionStatus } from "@/lib/integrations/api";

const connected: ZoomConnectionStatus = {
  available: true,
  connected: true,
  zoomEmail: "host@example.com",
  connectedAt: null,
  needsReconnect: false,
};

function render(
  status: ZoomConnectionStatus | null,
  ready: boolean,
  checked = true,
) {
  return renderToStaticMarkup(
    createElement(ZoomAutoCreateOption, {
      status,
      ready,
      checked,
      onChange: () => {},
    }),
  );
}

describe("ZoomAutoCreateOption", () => {
  it("offers to create the meeting on the connected account", () => {
    const html = render(connected, true);
    expect(html).toContain("Create the Zoom meeting automatically");
    expect(html).toContain("host@example.com");
    expect(html).toContain('type="checkbox"');
  });

  it("points a user without Zoom to Connect Zoom, keeping paste as a fallback", () => {
    const html = render(
      { ...connected, connected: false, zoomEmail: null },
      false,
    );
    expect(html).toContain("Connect Zoom");
    expect(html).toContain("/settings/integrations/zoom");
    expect(html).toContain("paste a Zoom link");
  });

  it("asks for a reconnect when the grant stopped working", () => {
    const html = render({ ...connected, needsReconnect: true }, false);
    expect(html).toContain("Reconnect Zoom");
  });

  it("stays out of the way when the server has no Zoom app", () => {
    const html = render(
      { ...connected, available: false, connected: false },
      false,
    );
    expect(html).toBe("");
  });
});
