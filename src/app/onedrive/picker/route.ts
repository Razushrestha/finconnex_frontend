/**
 * The OneDrive chooser redirects its pop-up here. The page only loads
 * Microsoft's picker script so the pop-up can finish and hand the files back.
 */
export function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OneDrive</title>
  </head>
  <body>
    <script src="https://js.live.net/v7.2/OneDrive.js"></script>
  </body>
</html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
