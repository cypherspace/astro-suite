import type { WalkthroughSpec } from "./walkthrough";

/**
 * Slots provided to an app at mount time. The shell guarantees
 * `root` is empty on mount; the app must leave it empty on unmount.
 *
 * Each app owns its own DOM and (for sky apps) its own SkyViewerCore
 * instance. The shell is intentionally minimal — it owns only the
 * outer chrome (title block, tab bar, action button bar, fullscreen
 * overlay slot).
 */
export interface AppMountPoints {
  root: HTMLElement;
  // Action-button bar in the page header. Apps push their buttons
  // here on mount; the shell clears them on tab change.
  headerButtonsEl: HTMLElement;
  // Setter for the page subtitle (under the H1).
  setSubtitle: (text: string) => void;
  // Mount slot for the fullscreen sky-controls strip (fixed row at
  // the top of the viewport). Sky apps move their controls between
  // the in-flow slot and this strip when Aladin enters/leaves
  // fullscreen.
  fullscreenStripEl: HTMLElement;
}

export interface AppDocs {
  howItWorks?: () => HTMLElement;
  howWeKnow?: () => HTMLElement;
  diagramGuide?: () => HTMLElement | null;
}

export interface AppModule {
  id: string;
  tabLabel: string;
  tabSubtitle?: string;
  needsSky: boolean;
  title: string;
  subtitle: string;
  initialTarget?: string;
  initialFovDeg?: number;
  initialSurvey?: string;
  docs?: AppDocs;
  walkthrough?: WalkthroughSpec;
  mount(points: AppMountPoints): Promise<() => void>;
}
