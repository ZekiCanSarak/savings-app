import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Where the web version is hosted (EAS Hosting). Used for link previews. */
const SITE_URL = 'https://goalpot.expo.app';

/**
 * Web only: the HTML shell around every page when the web version is built.
 * Runs in Node at build time, so no browser APIs here.
 *
 * The meta tags make it a Progressive Web App ("Goalpot"): added to the iPhone
 * home screen from Safari, it opens full screen with no browser bars.
 */
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="en-GB" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/*
          viewport-fit=cover lets the app draw behind the iPhone notch and home
          indicator (safe-area-context pads content back out of them).
          maximum-scale=1 stops iOS zooming in whenever a text field is tapped.
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <title>Goalpot</title>
        <meta
          name="description"
          content="Goals, a monthly plan and a budget that fits your pay. Free, no sign-up, and your data stays on your device."
        />

        {/* Link previews (WhatsApp, iMessage, social apps). They need absolute URLs. */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Goalpot" />
        <meta property="og:title" content="Goalpot: save for the things you want" />
        <meta
          property="og:description"
          content="Goals, a monthly plan and a budget that fits your pay. Free, no sign-up, private."
        />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />

        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />

        {/* iOS reads these rather than the manifest. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Goalpot" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />
        {/* Page background before the app loads, so there's no white flash in dark mode. */}
        <style dangerouslySetInnerHTML={{ __html: backgroundCss }} />

        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

// Text fields show focus with their own green border (components/ui/text-field.tsx),
// so the browser's focus box inside them is hidden.
const backgroundCss = `
input:focus, textarea:focus { outline: none; }
body { background-color: #ffffff; }
@media (prefers-color-scheme: dark) {
  body { background-color: #000000; }
}`;
