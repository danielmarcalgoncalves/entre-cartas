/**
 * minioClient.js
 * Serviço de acesso ao MinIO (Object Storage S3-compatível).
 *
 * Como funciona:
 * - O SDK minio se conecta ao container MinIO usando as variáveis MINIO_*
 * - ensureBucket() cria o bucket automaticamente na primeira vez que o backend sobe
 * - uploadFile() recebe um Buffer (da memória), gera um nome único e envia ao MinIO,
 *   retornando a URL pública do objeto para salvar no banco de dados
 * - deleteFile() remove um objeto pelo nome (usado ao trocar foto)
 */

const Minio = require('minio');

const crypto    = require('crypto');
const ENDPOINT    = process.env.MINIO_ENDPOINT     || 'minio';
const PORT        = parseInt(process.env.MINIO_PORT || '9000', 10);
const ACCESS_KEY  = process.env.MINIO_ROOT_USER    || 'minioadmin';
const SECRET_KEY  = process.env.MINIO_ROOT_PASSWORD || 'minioadmin123';
const BUCKET      = process.env.MINIO_BUCKET       || 'perfil-fotos';
const JOURNAL_BUCKET = process.env.MINIO_JOURNAL_BUCKET || 'journal-media';
const PUBLIC_URL  = process.env.MINIO_PUBLIC_URL   || 'http://localhost:9000';

const minioClient = new Minio.Client({
  endPoint:  ENDPOINT,
  port:      PORT,
  useSSL:    false,
  accessKey: ACCESS_KEY,
  secretKey: SECRET_KEY
});

async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1');
      console.log('[MinIO] Bucket "' + BUCKET + '" criado com sucesso.');
    } else {
      console.log('[MinIO] Bucket "' + BUCKET + '" ja existe. Pronto.');
    }

    // Configurar política de leitura pública para permitir que o navegador acesse as fotos via HTTP GET
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${BUCKET}/*`]
        }
      ]
    };
    await minioClient.setBucketPolicy(BUCKET, JSON.stringify(policy));
    console.log('[MinIO] Politica de leitura publica configurada no bucket "' + BUCKET + '".');
  } catch (err) {
    console.error('[MinIO] Erro ao verificar/criar bucket ou configurar politica:', err.message);
  }
}

async function uploadFile(buffer, filename, mimetype, usuarioId) {
  const ext = filename.split('.').pop().toLowerCase();
  const rawFileName = 'usuario-' + usuarioId + '-' + Date.now() + '.' + ext;
  const objectName = 'avatar/' + rawFileName;
  await minioClient.putObject(BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': mimetype
  });
  // Rota pública do backend que faz streaming do MinIO de forma transparente
  const url = '/api/profile/avatar/' + rawFileName;
  return { objectName, url };
}

async function getFileStream(objectName) {
  return await minioClient.getObject(BUCKET, objectName);
}

async function deleteFile(objectName) {
  try {
    await minioClient.removeObject(BUCKET, objectName);
    console.log('[MinIO] Objeto removido: ' + objectName);
  } catch (err) {
    console.warn('[MinIO] Aviso ao remover objeto antigo:', err.message);
  }
}

async function ensureJournalBucket() {
  try {
    const exists = await minioClient.bucketExists(JOURNAL_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(JOURNAL_BUCKET, 'us-east-1');
      console.log('[MinIO] Private journal bucket "' + JOURNAL_BUCKET + '" created.');
    }
  } catch (err) {
    console.error('[MinIO] Error verifying/creating journal bucket:', err.message);
  }
}

function getSafeExtForMime(mimetype) {
  if (mimetype === 'image/jpeg') return 'jpg';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'bin';
}

async function uploadJournalMedia(buffer, mimetype, usuarioId, notebookClientId) {
  const safeNb = String(notebookClientId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const ext = getSafeExtForMime(mimetype);
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const fileName = `${Date.now()}-${uniqueId}.${ext}`;
  const objectKey = `journal/${Number(usuarioId)}/${safeNb}/${fileName}`;
  await minioClient.putObject(JOURNAL_BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': mimetype
  });
  return {
    objectKey,
    url: `/api/journal/media/${Number(usuarioId)}/${safeNb}/${fileName}`
  };
}

async function getJournalMediaStream(objectKey) {
  return await minioClient.getObject(JOURNAL_BUCKET, objectKey);
}

async function deleteJournalMedia(objectKey) {
  try {
    await minioClient.removeObject(JOURNAL_BUCKET, objectKey);
  } catch (err) {
    console.warn('[MinIO] Failed to remove journal media object:', objectKey, err.message);
  }
}

module.exports = {
  minioClient,
  ensureBucket,
  ensureJournalBucket,
  uploadFile,
  getFileStream,
  deleteFile,
  uploadJournalMedia,
  getJournalMediaStream,
  deleteJournalMedia,
  BUCKET,
  JOURNAL_BUCKET,
  PUBLIC_URL
};
