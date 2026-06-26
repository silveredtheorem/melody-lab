import { z } from 'zod';

export const SourceTypeEnum = z.enum(['HUMAN', 'AI_GENERATED']);

export const LayerSchema = z.object({
  s3Key: z.string(),
  instrument: z.string(),
  durationMs: z.number(),
  startMs: z.number().default(0),
  bpm: z.number().optional(),
  keySignature: z.string().optional(),
  sourceType: SourceTypeEnum,
});

export const CreateCommitSchema = z.object({
  message: z.string(),
  branchId: z.string().uuid(),
  layers: z.array(LayerSchema),
});

export type SourceType = z.infer<typeof SourceTypeEnum>;
export type Layer = z.infer<typeof LayerSchema>;
export type CreateCommitInput = z.infer<typeof CreateCommitSchema>;
