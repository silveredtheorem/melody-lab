import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
