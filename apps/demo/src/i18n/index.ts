import { en } from "./en";
import { zhCN } from "./zh-CN";
import type { DemoCopy, Language } from "./types";

export type { DemoCopy, Language } from "./types";

export function createCopy(language: Language): DemoCopy {
  return language === "en" ? en : zhCN;
}
