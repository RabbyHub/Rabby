const DEFAULT_MANIFEST_DEV_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAr/KZ9VNM7vqtTKBP3q8JabUzWqQRKDwiyMj8MHg7wnHrZeg+Z7hJe4c2tcifIr7VEjLVy0Nh6E9SCabb1W4tur3Biu4yX1KgX2sbMV8kBZaXN+v2GDSqbRjm0rchy/9f7PHyL1NYh6hTJfwyCl9lDnjaaBkR8J/rFOH7S+5uJbrSWfhgpH+f6Qh2v0Z8ok0fuDOvDHCfp3RMGQ1N7w6kHLpaBfj3uu/JIRylfajx7knWwlL6a5rXFoMP8hP8e3Aisln6zobFvC7Aibs2rDHXnsQTp5wFDE7p8NMwR/lyu9vp1OdwdhAVs+S62uvOQoSIds/RhvOEVkPQXMTW2p74bQIDAQAB';

const PRODUCTION_BUILD_ENVS = new Set(['pro']);

const isProductionBuild = (buildEnv) =>
  PRODUCTION_BUILD_ENVS.has(buildEnv || '');

const createManifestTransform = ({ manifestType, buildEnv }) => {
  if (manifestType !== 'chrome-mv3') {
    return null;
  }

  const isProd = isProductionBuild(buildEnv);
  const manifestKey = process.env.MANIFEST_DEV_KEY || DEFAULT_MANIFEST_DEV_KEY;

  const transformer = (content) => {
    const contentText = content.toString();

    if (isProd && !contentText.includes('"key"')) {
      return content;
    }

    if (!isProd && manifestKey) {
      const expected = `"key": "${manifestKey}"`;
      if (contentText.includes(expected)) {
        return content;
      }
    }

    const manifest = JSON.parse(contentText);

    if (isProd) {
      if (manifest.key) {
        delete manifest.key;
      }
    } else if (manifestKey) {
      manifest.key = manifestKey;
    }

    return Buffer.from(JSON.stringify(manifest, null, 2));
  };

  return {
    transformer,
    cache: {
      keys: (defaultCacheKeys) => ({
        ...defaultCacheKeys,
        manifestType,
        buildEnv,
        manifestKey,
      }),
    },
  };
};

module.exports = {
  createManifestTransform,
};
