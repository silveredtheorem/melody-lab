import { z } from 'zod';

export const CreateMergeRequestSchema = z.object({
  sourceBranchId: z.string().uuid(),
  targetBranchId: z.string().uuid(),
});

export type CreateMergeRequestInput = z.infer<typeof CreateMergeRequestSchema>;

export const ResolveConflictSchema = z.object({
  resolution: z.enum(['OURS', 'THEIRS', 'BOTH']),
});

export type ResolveConflictInput = z.infer<typeof ResolveConflictSchema>;
