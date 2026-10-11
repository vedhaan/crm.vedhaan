const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET

const uploadToR2 = async (fileBuffer, fileKey, mimeType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: mimeType,
  })
  await r2Client.send(command)
  return fileKey
}

const deleteFromR2 = async (fileKey) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  })
  await r2Client.send(command)
}

const getSignedDownloadUrl = async (fileKey, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  })
  return await getSignedUrl(r2Client, command, { expiresIn })
}

module.exports = { uploadToR2, deleteFromR2, getSignedDownloadUrl }