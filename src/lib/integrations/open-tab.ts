/**
 * Opens an app's integration page (a consent screen, its dashboard) in a new
 * tab. When the address has to be fetched first, the tab is opened blank
 * straight away — still inside the click, so the browser doesn't block it —
 * and pointed at the address once it arrives.
 */
export async function openIntegrationTab(
  url: string | (() => Promise<string>),
): Promise<void> {
  if (typeof url === "string") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const tab = window.open("about:blank", "_blank");
  try {
    const target = await url();
    if (!tab || tab.closed) {
      // The browser refused a new tab: fall back to this one.
      window.location.assign(target);
      return;
    }
    tab.opener = null;
    tab.location.href = target;
  } catch (err) {
    tab?.close();
    throw err;
  }
}
