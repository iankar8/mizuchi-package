
// Re-export all functions from the service modules

// Research Assistant
export { queryResearchAssistant } from './researchAssistant';

// Research Queries
export { 
  fetchResearchNotes,
  getSharedResearchNotes
} from './researchQueries';

// Research Mutations
export {
  createResearchNote,
  updateResearchNote,
  deleteResearchNote
} from './researchMutations';

// Research Collaborations
export {
  shareResearchNote,
  removeCollaborator,
  getNoteCollaborators
} from './researchCollaborations';
