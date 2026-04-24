import { useContext } from "react";
import { NovelContext } from "../contexts/NovelContext";

export function useNovel() {
  return useContext(NovelContext);
}