import { z } from 'zod';

const versionId = z.string().regex(/^\d+(?:\.\d+){2,3}$/);
const versionEntry = z.object({
  id: versionId,
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  changelog: z.string(),
});
export const versionInfoSchema = z.object({
  version: versionEntry,
  latest_version: versionEntry,
});
export type VersionInfo = z.infer<typeof versionInfoSchema>;

export const versionInfoResponseSchema = versionInfoSchema.extend({
  version: versionEntry.nullable(),
  latest_version: versionEntry.nullable(),
});

export const compareExtensionVersions = (a: string, b: string) => {
  const left = versionId.parse(a).split('.').map(Number);
  const right = versionId.parse(b).split('.').map(Number);
  for (let i = 0; i < 4; i++) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
};

export const UPDATE_BANNER_COOLDOWN = 24 * 60 * 60 * 1000;
