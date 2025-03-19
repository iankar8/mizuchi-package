
import { ResearchNote } from "../types";

export interface ResearchNotebookHandle {
  createNote: () => Promise<ResearchNote | void>;
}
