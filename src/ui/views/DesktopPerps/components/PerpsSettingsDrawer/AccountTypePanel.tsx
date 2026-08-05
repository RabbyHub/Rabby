import React from 'react';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import {
  UserAbstraction,
  UserAbstractionResp,
} from '@rabby-wallet/hyperliquid-sdk';
import { useRabbySelector } from '@/ui/store';
import { usePerpsActions } from '@/ui/views/Perps/hooks/usePerpsActions';
import { ReactComponent as RcIconLoginLoading } from 'ui/assets/perps/IconLoginLoading.svg';
import { PerpsCheckbox } from '../TradingPanel/components/PerpsCheckbox';

/**
 * `Manual` is the SDK's `DISABLED` abstraction — the plain per-DEX balances
 * mode, which is also what every non-unified / non-portfolio response value
 * (`default`, `dexAbstraction`, `disabled`) resolves to.
 */
export const ACCOUNT_TYPE_OPTIONS = [
  {
    key: 'unified',
    abstraction: UserAbstraction.UNIFIED_ACCOUNT,
    labelKey: 'unifiedAccountLabel',
    // Card titles carry the "(Recommend)" hint; summary rows and toasts use
    // the bare name.
    shortLabelKey: 'unifiedAccountShortLabel',
    descKey: 'unifiedAccountDesc',
  },
  {
    key: 'manual',
    abstraction: UserAbstraction.DISABLED,
    labelKey: 'manualLabel',
    shortLabelKey: 'manualLabel',
    descKey: 'manualDesc',
  },
  {
    key: 'portfolioMargin',
    abstraction: UserAbstraction.PORTFOLIO_MARGIN,
    labelKey: 'portfolioMarginLabel',
    shortLabelKey: 'portfolioMarginLabel',
    descKey: 'portfolioMarginDesc',
  },
] as const;

export type PerpsAccountTypeOption = typeof ACCOUNT_TYPE_OPTIONS[number];

/**
 * Mirrors `usePerpsAccount`'s `isUnifiedAccount` / `isPortfolioMargin`
 * derivation — keep the two in sync.
 */
export const resolveAccountTypeOption = (
  userAbstraction?: UserAbstractionResp
): PerpsAccountTypeOption => {
  if (userAbstraction === UserAbstractionResp.unifiedAccount) {
    return ACCOUNT_TYPE_OPTIONS[0];
  }
  if (userAbstraction === UserAbstractionResp.portfolioMargin) {
    return ACCOUNT_TYPE_OPTIONS[2];
  }
  return ACCOUNT_TYPE_OPTIONS[1];
};

export const AccountTypePanel: React.FC = () => {
  const { t } = useTranslation();
  const { handleSetUserAbstraction } = usePerpsActions();
  const userAbstraction = useRabbySelector((s) => s.perps.userAbstraction);

  const currentKey = resolveAccountTypeOption(userAbstraction).key;
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  // The drawer is `destroyOnClose`, so a switch can still be in flight when
  // this panel unmounts — don't touch state after that.
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // `pendingKey` only reflects the guard one render later, which is too late
  // for a double-click — this ref closes the window synchronously.
  const pendingRef = React.useRef(false);

  const handleSelect = useMemoizedFn(async (option: PerpsAccountTypeOption) => {
    if (pendingRef.current || option.key === currentKey) return;
    pendingRef.current = true;
    setPendingKey(option.key);
    try {
      // Surfaces its own success/error toast and refreshes the store's
      // `userAbstraction` — nothing left to do here.
      await handleSetUserAbstraction(option.abstraction);
    } finally {
      pendingRef.current = false;
      if (mountedRef.current) {
        setPendingKey(null);
      }
    }
  });

  return (
    <div className="flex flex-col gap-[24px] px-[20px] py-[12px]">
      {ACCOUNT_TYPE_OPTIONS.map((option) => {
        const selected = option.key === currentKey;
        const pending = option.key === pendingKey;
        return (
          <div
            key={option.key}
            onClick={() => handleSelect(option)}
            className={clsx(
              'px-[16px] py-[14px] rounded-[6px] bg-rb-neutral-bg-2',
              'border border-solid',
              selected ? 'border-rb-blue-default' : 'border-rb-neutral-line',
              selected || pendingKey ? 'cursor-default' : 'cursor-pointer'
            )}
          >
            <div className="flex items-start gap-[6px]">
              <div className="shrink-0 w-[16px] h-[16px] flex items-center justify-center">
                {pending ? (
                  <RcIconLoginLoading className="w-[16px] h-[16px] animate-spin" />
                ) : (
                  <PerpsCheckbox
                    variant="radio-check"
                    size={16}
                    checked={selected}
                    onChange={() => handleSelect(option)}
                  />
                )}
              </div>
              <div className="flex flex-1 min-w-0 flex-col gap-[6px]">
                <div className="text-[13px] leading-[16px] font-medium text-rb-neutral-title-1">
                  {t(
                    `page.perpsPro.settings.accountTypeOption.${option.labelKey}`
                  )}
                </div>
                <div className="text-[12px] leading-[18px] text-rb-neutral-foot">
                  {t(
                    `page.perpsPro.settings.accountTypeOption.${option.descKey}`
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AccountTypePanel;
