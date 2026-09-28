import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// ======== Environment validation ========

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    throw new Error(
      'Missing R2 environment variables. Required: ' +
      'R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL'
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

// ======== S3 Client (lazy singleton) ========

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  const config = getR2Config();
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return s3Client;
}

// ======== Key generation ========

/** Generate a unique storage key for a song */
export function generateSongKey(userId: string, playlistId: string, songId?: string): string {
  const id = songId || uuidv4();
  return `users/${userId}/songs/${id}.mp3`;
}

/** Generate a unique storage key for a playlist cover */
export function generateCoverKey(userId: string, playlistId: string, extension: string): string {
  return `users/${userId}/playlists/${playlistId}/cover${extension}`;
}

// ======== Presigned URLs ========

/** Generate a presigned PUT URL for direct browser upload */
export async function generatePresignedUploadUrl(
  objectKey: string,
  contentType: string,
  maxSizeBytes: number
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const config = getR2Config();
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 3600, // 1 hour
  });

  const publicUrl = `${config.publicUrl.replace(/\/$/, '')}/${objectKey}`;

  return { uploadUrl, publicUrl };
}

/** Delete an object from R2 */
export async function deleteObject(objectKey: string): Promise<void> {
  const config = getR2Config();
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
  });

  await client.send(command);
}
