import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'snapshots');

// Ensure storage folder path exists
async function ensureDirExists() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

/**
 * Compresses and saves candle details to local disk storage
 * @param {string} analysisId - Unique identifier
 * @param {Array} candles - Array of raw candles
 * @param {Object} indicators - Calculated indicator maps
 */
export async function saveReplaySnapshot(analysisId, candles, indicators) {
  await ensureDirExists();
  
  const payload = JSON.stringify({
    analysisId,
    candles,
    indicators,
    savedAt: new Date().toISOString()
  });

  try {
    // Compress string content to save storage footprint
    const compressedBuffer = await gzip(payload);
    const fileName = `${analysisId}.json.gz`;
    const filePath = path.join(STORAGE_DIR, fileName);
    
    await fs.writeFile(filePath, compressedBuffer);
    
    // Return relative storage path to save in the database
    return `storage/snapshots/${fileName}`;
  } catch (error) {
    console.error("saveReplaySnapshot error:", error);
    throw new Error(`Failed to save replay snapshot: ${error.message}`);
  }
}

/**
 * Loads and decompresses a replay snapshot file
 * @param {string} storagePath - Database stored path relative to root
 */
export async function loadReplaySnapshot(storagePath) {
  try {
    const filePath = path.join(process.cwd(), storagePath);
    const compressedBuffer = await fs.readFile(filePath);
    const decompressedBuffer = await gunzip(compressedBuffer);
    
    return JSON.parse(decompressedBuffer.toString('utf-8'));
  } catch (error) {
    console.error("loadReplaySnapshot error:", error);
    throw new Error(`Failed to load replay snapshot: ${error.message}`);
  }
}
