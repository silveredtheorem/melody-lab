import { z } from 'zod';

export const GetUploadUrlSchema = z.object({
  s3Key: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\/_\-\.]+$/),
});

export type GetUploadUrlInput = z.infer<typeof GetUploadUrlSchema>;

export const GetPlaybackUrlSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[a-zA-Z0-9\/_\-\.]+$/),
});

export type GetPlaybackUrlInput = z.infer<typeof GetPlaybackUrlSchema>;
