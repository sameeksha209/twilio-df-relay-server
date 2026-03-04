// secretManager.js
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

const client = new SecretManagerServiceClient();
let secretsCache = null;

/**
 * Fetch a single secret from Secret Manager
 * @param {string} secretName - The secret name in Secret Manager
 * @param {string} version - Secret version (default 'latest')
 */
async function accessSecret(secretName, version = "latest") {
    const projectId =
        process.env.GCP_PROJECT ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        (await client.getProjectId());

    const [response] = await client.accessSecretVersion({
        name: `projects/${projectId}/secrets/${secretName}/versions/${version}`,
    });

    return response.payload.data.toString("utf8");
}

/**
 * Load all secrets defined in environment variables
 * Caches them for reuse
 */
async function loadSecrets() {
    if (secretsCache) return secretsCache;

    // Secret names configured via environment variables
    const {
        JWT_SECRET_NAME,
        SECRET_VERSION = "latest", // optional, defaults to 'latest'
    } = process.env;

    if (!JWT_SECRET_NAME) {
        throw new Error(
            "Environment variables JWT_SECRET_NAME must be set"
        );
    }

    const [JWT_SECRET] = await Promise.all([
        accessSecret(JWT_SECRET_NAME, SECRET_VERSION),
    ]);

    secretsCache = { JWT_SECRET };
    return secretsCache;
}

module.exports = { loadSecrets };