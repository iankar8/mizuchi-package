
// This hook is now deprecated in favor of useCollaboratorForm
// It's kept for backward compatibility but will be removed in future versions
import { useCollaboratorForm } from '@/hooks/use-collaborator-form';

export function useWatchlistCollaborators() {
  const {
    collaboratorEmail,
    setCollaboratorEmail,
    inviteCollaborator
  } = useCollaboratorForm();

  return {
    collaboratorEmail,
    setCollaboratorEmail,
    inviteCollaborator
  };
}
