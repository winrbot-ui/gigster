import { config as defaults } from "./config.defaults.js";
import { config as local } from "./config.local.js";

/** Sync merge — service workers cannot use top-level await. */
export const config = { ...defaults, ...local };
