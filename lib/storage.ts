/**
 * Upload a file to Supabase Storage via the server API.
 * This avoids exposing the service role key on the client.
 *
 * @param file  - The file to upload
 * @param bucket - The storage bucket name
 * @returns The public URL of the uploaded file
 * @throws If the upload fails
 */
export async function uploadFile(file: File, bucket: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'فشل رفع الملف');
  }
  return data.url;
}
