const path = require('path');
const fs = require('fs').promises;

const MAX_SESSION_AGE_MS = 30 * 60 * 1000; // unchanged from previous global.uploadSessions behavior

const uploadSessions = new Map(); // uploadId -> { fileName, fileSize, totalChunks, uploadPath, uploadedChunks: Set, createdAt }

async function cleanupExpiredSessions(chunksBaseDir) {
  const now = Date.now();
  for (const [uploadId, session] of uploadSessions.entries()) {
    if (now - session.createdAt > MAX_SESSION_AGE_MS) {
      await fs.rm(path.join(chunksBaseDir, uploadId), { recursive: true, force: true }).catch(() => {});
      uploadSessions.delete(uploadId);
    }
  }
}

module.exports = { uploadSessions, cleanupExpiredSessions, MAX_SESSION_AGE_MS };
