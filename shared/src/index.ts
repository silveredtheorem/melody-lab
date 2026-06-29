import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export * from './schemas/auth.schemas';
export * from './schemas/project.schemas';
export * from './schemas/branch.schemas';
export * from './schemas/commit.schemas';
export * from './schemas/storage.schemas';
export * from './schemas/ai.schemas';
export * from './schemas/merge.schemas';
