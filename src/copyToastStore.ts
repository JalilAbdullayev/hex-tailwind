import { atom } from "nanostores";

export type CopyToast = {
  id: number;
  text: string;
};

export const copyToastStore = atom<CopyToast | null>(null);

let nextToastId = 0;

export const announceCopy = (value?: string) => {
  copyToastStore.set({
    id: ++nextToastId,
    text: value ? `Copied ${value}` : "Copied",
  });
};
