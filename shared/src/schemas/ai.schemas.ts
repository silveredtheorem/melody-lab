import { z } from 'zod';

export const AIGenerationSchema = z.object({
  branchId: z.string().uuid(),
  instrument: z.string().min(1).max(50),
  prompt: z.string().min(1).max(2000),
  sourceType: z.enum(['MUBERT', 'LALAL']),
});

export type AIGenerationInput = z.infer<typeof AIGenerationSchema>;
