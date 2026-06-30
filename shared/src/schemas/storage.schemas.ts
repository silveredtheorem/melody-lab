import { z } from 'zod';

const S3_KEY_PATTERN = /^projects\/[0-9a-fA-F-]{36}\/[0-9a-fA-F-]{36}\.[a-zA-Z0-9]+$/;

export const GetUploadUrlSchema = z.object({
  s3Key: z.string().min(1).max(255).regex(S3_KEY_PATTERN),
});

export type GetUploadUrlInput = z.infer<typeof GetUploadUrlSchema>;

export const GetPlaybackUrlSchema = z.object({
  key: z.string().min(1).max(255).regex(S3_KEY_PATTERN),
});

export type GetPlaybackUrlInput = z.infer<typeof GetPlaybackUrlSchema>;
