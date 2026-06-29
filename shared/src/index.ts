import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export * from './schemas/auth.schemas.js';
export * from './schemas/project.schemas.js';
export * from './schemas/branch.schemas.js';
export * from './schemas/commit.schemas.js';
export * from './schemas/storage.schemas.js';
export * from './schemas/ai.schemas.js';
export * from './schemas/merge.schemas.js';
