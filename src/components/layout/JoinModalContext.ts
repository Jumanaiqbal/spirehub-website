import { createContext, useContext } from "react";

export type OpenJoinModal = (plan?: string | null) => void;

export const JoinModalContext = createContext<OpenJoinModal>(() => {});

/** Open the Enquire / Join form modal from anywhere in the tree. */
export function useJoinModal(): OpenJoinModal {
  return useContext(JoinModalContext);
}
