
export type ResearchNote = {
  id: string;
  title: string;
  content: string;
  date: Date;
  tags: string[];
  relatedStocks?: string[];
  isPublic?: boolean;
  collaborators?: Collaborator[];
  owner?: UserMinimal;
};

export type Tag = {
  name: string;
};

export type CollaborationPermission = 'view' | 'edit' | 'admin';

export type Collaborator = {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  permissionLevel: CollaborationPermission;
};

export type UserMinimal = {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

