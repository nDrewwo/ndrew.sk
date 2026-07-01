const path = require('path');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Joins untrusted segments onto baseDir and guarantees the result is baseDir
// itself or strictly inside it. Throws HttpError(403) otherwise.
function resolveSafePath(baseDir, ...untrustedSegments) {
  const target = path.join(baseDir, ...untrustedSegments);
  const rel = path.relative(baseDir, target);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new HttpError(403, 'Access denied');
  }
  return target;
}

// Strips any directory component from an untrusted filename (originalname,
// session.fileName) and rejects '.', '..', or empty results.
function sanitizeFilename(name) {
  const base = path.basename(String(name || '').trim());
  if (!base || base === '.' || base === '..') {
    throw new HttpError(400, 'Invalid file name');
  }
  return base;
}

// Validates chunkIndex BEFORE it's used to build any path.
function parseChunkIndex(rawChunkIndex, totalChunks) {
  const index = Number(rawChunkIndex);
  if (!Number.isInteger(index) || index < 0 || index >= totalChunks) {
    throw new HttpError(400, 'Invalid chunk index');
  }
  return index;
}

// Wraps an async route handler. HttpErrors become their status + message;
// anything else is logged and returns a generic 500. Self-contained --
// never calls next(err), so it doesn't depend on Express 5 promise forwarding.
function asyncHandler(fn, fallbackMessage = 'Internal server error') {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error(fallbackMessage, err);
      res.status(500).json({ error: fallbackMessage });
    }
  };
}

module.exports = { HttpError, resolveSafePath, sanitizeFilename, parseChunkIndex, asyncHandler };
