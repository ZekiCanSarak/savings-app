export type LandingPageProps = {
  /** Go on to the welcome flow. */
  onGetStarted: () => void;
  /** Open the app with sample data. */
  onTryDemo: () => void;
};

/** The landing page is web only (see landing-page.web.tsx); phones go straight to the welcome flow. */
export function LandingPage(_props: LandingPageProps) {
  return null;
}
