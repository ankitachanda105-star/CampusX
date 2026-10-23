/**
 * CampusX AI Microservice HTTP Client
 * Bridges Node.js backend services to the Python FastAPI microservice
 * Includes synchronous execution with timeout and fallback handling
 */

const { spawnSync } = require('child_process');

function getBaseUrl() {
  return process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
}

/**
 * Executes a synchronous POST request to the Python AI service
 * @param {string} endpoint - API route (e.g. '/classify', '/queue-wait')
 * @param {Object} payload - JSON request body
 * @param {number} timeoutMs - Timeout in milliseconds (default: 1500)
 * @returns {Object|null} Parsed JSON response or null on timeout/failure
 */
function postSync(endpoint, payload, timeoutMs = 1500) {
  try {
    const jsonStr = JSON.stringify(payload);
    const timeoutSec = (timeoutMs / 1000).toString();
    const baseUrl = getBaseUrl();
    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';

    const res = spawnSync(curlCmd, [
      '-s',
      '-X', 'POST',
      `${baseUrl}${endpoint}`,
      '-H', 'Content-Type: application/json',
      '--data-binary', '@-',
      '--max-time', timeoutSec,
    ], {
      input: jsonStr,
      encoding: 'utf-8',
      timeout: timeoutMs + 500,
      windowsHide: true,
    });

    if (res && res.status === 0 && res.stdout) {
      const parsed = JSON.parse(res.stdout.trim());
      if (parsed && parsed.success) {
        return parsed;
      }
    }
  } catch (err) {
    // Non-fatal: handled by callers falling back to deterministic heuristics
  }
  return null;
}

/**
 * Checks if the Python AI microservice is currently reachable and healthy
 * @returns {boolean}
 */
function isAIServiceHealthy() {
  try {
    const baseUrl = getBaseUrl();
    const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const res = spawnSync(curlCmd, [
      '-s',
      '--max-time', '1.0',
      `${baseUrl}/health`,
    ], {
      encoding: 'utf-8',
      timeout: 1500,
      windowsHide: true,
    });
    if (res && res.status === 0 && res.stdout) {
      const data = JSON.parse(res.stdout.trim());
      return data && data.status === 'healthy';
    }
  } catch (e) {
    return false;
  }
  return false;
}

module.exports = {
  postSync,
  isAIServiceHealthy,
  getBaseUrl,
};
