import { Font } from "@/lib/bdfparser";
import { create } from "zustand";

type State = {
  font: Font | undefined,
};

type Actions = {
  setFont: (font?: Font) => void,
};

export const useFontStore = create<State & Actions>((set, get) => ({
  font: undefined,
  setFont: (font = undefined) => {
    set({ font })
  },
}));
