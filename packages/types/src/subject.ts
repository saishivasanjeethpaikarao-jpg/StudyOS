/** A user-owned academic subject used to organize assignments. */
export interface Subject {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  archivedAt: Date | null;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubjectInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
}

export interface UpdateSubjectInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number;
  archivedAt?: string | null;
}

export interface SubjectFilterInput {
  archived?: boolean;
}
