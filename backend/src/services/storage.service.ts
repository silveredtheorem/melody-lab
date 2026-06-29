import { supabase } from '../lib/supabase'

const BUCKET = 'audio-layers'

export async function getUploadPresignedUrl(s3Key: string): Promise<{ signedUrl: string; s3Key: string }> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(s3Key)
  if (error) throw error
  return { signedUrl: data.signedUrl, s3Key }
}

export async function getPlaybackPresignedUrl(s3Key: string): Promise<{ signedUrl: string }> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(s3Key, 3600)
  if (error) throw error
  return { signedUrl: data.signedUrl }
}
