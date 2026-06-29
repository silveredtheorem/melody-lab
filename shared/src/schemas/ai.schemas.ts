import { z } from 'zod';

export const AIGenerationSchema = z.object({
  branchId: z.string().uuid(),
  instrument: z.string(),
  prompt: z.string().min(1),
  sourceType: z.enum(['MUBERT', 'LALAL']),
});

export type AIGenerationInput = z.infer<typeof AIGenerationSchema>;
