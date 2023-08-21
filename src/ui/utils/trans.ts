import { GAS_LEVEL_TEXT } from '@/constant';

export function getGasLevelI18nKey(level: string) {
  if (!GAS_LEVEL_TEXT[level])
    return 'page.sendToken.GasSelector.level.$unknown' as const;

  return `page.sendToken.GasSelector.level.${
    level as keyof typeof GAS_LEVEL_TEXT
  }` as const;
}
