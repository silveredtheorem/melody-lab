import { z } from 'zod';

export const CreateBranchSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
