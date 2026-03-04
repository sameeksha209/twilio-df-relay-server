const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const client = new SecretManagerServiceClient();
let secretsCache = null;

/**
 * Fetch a single secret from Secret Manager
 * @param {string} secretName - The secret name in Secret Manager
 * @param {string} version - Secret version (default 'latest')
 */
async function accessSecret(secretName, version = "latest") {
  try {
    console.log(`[SecretManager] Accessing secret: ${secretName}, version: ${version}`);

    const projectId =
      process.env.GCP_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      (await client.getProjectId());

    console.log(`[SecretManager] Using projectId: ${projectId}`);

    const [response] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${secretName}/versions/${version}`,
    });

    const secretValue = response.payload.data.toString("utf8");
    console.log(`[SecretManager] Secret ${secretName} retrieved successfully`);

    return secretValue;
  } catch (err) {
    console.error(`[SecretManager] Failed to access secret ${secretName}:`, err);
    throw err;
  }
}

/**
 * Load all secrets defined in environment variables
 * Caches them for reuse
 */
async function loadSecrets() {
  try {
    if (secretsCache) {
      console.log("[SecretManager] Returning cached secrets");
      return secretsCache;
    }

    // Secret names configured via environment variables
    const { JWT_SECRET_NAME, SECRET_VERSION = "latest" } = process.env;

    if (!JWT_SECRET_NAME) {
      throw new Error("[SecretManager] Environment variable JWT_SECRET_NAME must be set");
    }

    console.log("[SecretManager] Loading secrets from Secret Manager...");

    const [JWT_SECRET] = await Promise.all([
      accessSecret(JWT_SECRET_NAME, SECRET_VERSION),
    ]);

    secretsCache = { JWT_SECRET };
    console.log(`[SecretManager] Secrets loaded and cached successfully: ${secretsCache}`);

    return secretsCache;
  } catch (err) {
    console.error("[SecretManager] Failed to load secrets:", err);
    throw err;
  }
}

module.exports = { loadSecrets };