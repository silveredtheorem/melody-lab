import { z } from 'zod';

export const GetUploadUrlSchema = z.object({
  s3Key: z.string(),
});

export type GetUploadUrlInput = z.infer<typeof GetUploadUrlSchema>;

export const GetPlaybackUrlSchema = z.object({
  key: z.string(),
});

export type GetPlaybackUrlInput = z.infer<typeof GetPlaybackUrlSchema>;
