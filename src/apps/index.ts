// Registry of available apps. Adding a new app = adding one entry
// here. Apps are loaded lazily via dynamic import so each tab's bundle
// only ships when that tab is first opened.

import type { AppModule } from "../shared/appTypes";

export interface AppRegistration {
  id: string;
  tabLabel: string;
  tabSubtitle?: string;
  load: () => Promise<AppModule>;
}

export const APPS: AppRegistration[] = [
  {
    id: "hr",
    tabLabel: "H-R diagram",
    tabSubtitle: "Hertzsprung–Russell diagram — stars",
    load: () => import("./hr/index").then((m) => m.default),
  },
  {
    id: "hubble",
    tabLabel: "Hubble diagram",
    tabSubtitle: "Hubble's law — galaxies",
    load: () => import("./hubble/index").then((m) => m.default),
  },
];
