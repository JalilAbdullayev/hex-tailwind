import { atom } from "nanostores";
import type { TailwindVersion } from "./utils/colors";

export type UrlColorState = {
  color: string;
  version: TailwindVersion | "";
};

export const hexCodeInUrlStore = atom<UrlColorState>({
  color: "",
  version: "",
});
