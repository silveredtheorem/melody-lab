import { z } from 'zod';

const BRANCH_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export const CreateBranchSchema = z.object({
  name: z.string().min(1).max(100).regex(BRANCH_NAME_PATTERN),
  fromBranch: z.string().min(1).max(100).regex(BRANCH_NAME_PATTERN).optional(),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;
