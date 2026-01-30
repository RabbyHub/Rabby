export type AccountScene = 'prediction';

export const SCENE_ACCOUNT_CONFIG: Record<AccountScene, { dapps: string[] }> = {
  prediction: {
    dapps: ['https://polymarket.com'],
  },
};

export const DAPP_SCENE_MAP: Record<string, AccountScene> = Object.entries(
  SCENE_ACCOUNT_CONFIG
).reduce((acc, [scene, { dapps }]) => {
  dapps.forEach((dapp) => {
    acc[dapp] = scene as AccountScene;
  });
  return acc;
}, {} as Record<string, AccountScene>);
