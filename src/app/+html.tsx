import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

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
        <meta name="description" content="Track your savings goals, budget and progress." />

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
