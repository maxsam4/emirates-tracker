import { execFile } from "child_process";

/**
 * Fetch JSON from a URL using curl as a subprocess.
 * Works around Akamai/CDN bot protection that blocks Node's built-in fetch
 * (TLS fingerprinting).
 */
export function curlFetchJson<T = unknown>(
  url: string,
  timeoutMs = 10000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutSec = Math.ceil(timeoutMs / 1000);
    execFile(
      "curl",
      ["-s", "-f", "--max-time", String(timeoutSec), url],
      { maxBuffer: 20 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`curl failed for ${url}: ${error.message}`));
          return;
        }
        try {
          resolve(JSON.parse(stdout) as T);
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}`));
        }
      }
    );
  });
}
