import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatUsdValue } from '@/ui/utils';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { t } from 'i18next';
import React from 'react';
import { GasAccountBlueBorderedButton } from './Button';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import openapi from '@/background/service/openapi';
import { useAml } from '../hooks';
import { GasAccountLoginCard } from './GasAccountLoginCard';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_TYPE } from '@/constant';

interface Props {
  isLogin?: boolean;
  isLoading?: boolean;
  onLoginPress?(): void;
  onDepositPress?(): void;
  onWithdrawPress?(): void;
  gasAccountInfo?: NonNullable<
    Awaited<ReturnType<typeof openapi.getGasAccountInfo>>
  >['account'];
}
const DEPOSIT_LIMIT = 1000;

export const GasAccountCard = ({
  isLogin,
  isLoading,
  onLoginPress,
  onDepositPress,
  onWithdrawPress,
  gasAccountInfo,
}: Props) => {
  const isRisk = useAml();

  const balance = gasAccountInfo?.balance || 0;

  const currentAccount = useCurrentAccount();

  const isGnosisSafe = React.useMemo(
    () => currentAccount?.type === KEYRING_TYPE.GnosisKeyring,
    [currentAccount?.type]
  );

  const depositDisabled = isRisk || balance >= DEPOSIT_LIMIT || isGnosisSafe;

  const depositTips = React.useMemo(() => {
    if (isGnosisSafe) {
      return t('page.gasAccount.safeAddressDepositTips');
    }
    if (isRisk) {
      return t('page.gasAccount.risk');
    }
    if (balance >= DEPOSIT_LIMIT) {
      return t('page.gasAccount.gasExceed');
    }
    return '';
  }, [isRisk, balance, t, isGnosisSafe]);

  const withdrawDisabled = !balance || gasAccountInfo?.has_iap_order;

  if (!isLogin) {
    return <GasAccountLoginCard onLoginPress={onLoginPress} />;
  }

  return (
    <GasAccountWrapperBg className="mb-[20px] flex flex-col items-center h-[260px] bg-r-neutral-card1 rounded-[8px] py-20 px-16 pt-24">
      <GasAccountBlueLogo />
      <div className="text-r-neutral-title-1 text-[32px] leading-normal font-bold mt-24">
        {formatUsdValue(balance, BigNumber.ROUND_DOWN)}
      </div>

      <div className="w-full mt-auto flex gap-12 items-center justify-center relative">
        <TooltipWithMagnetArrow
          className="rectangle w-[max-content]"
          visible={withdrawDisabled ? undefined : false}
          title={t(
            gasAccountInfo?.has_iap_order
              ? 'page.gasAccount.withdrawDisabledIAP'
              : 'page.gasAccount.noBalance'
          )}
        >
          <GasAccountBlueBorderedButton
            block
            className={clsx(
              withdrawDisabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={onWithdrawPress}
            disabled={withdrawDisabled}
          >
            {t('page.gasAccount.withdraw')}
          </GasAccountBlueBorderedButton>
        </TooltipWithMagnetArrow>
        <TooltipWithMagnetArrow
          className="rectangle w-[max-content]"
          visible={depositDisabled ? undefined : false}
          title={depositTips}
        >
          <Button
            disabled={depositDisabled}
            block
            size="large"
            type="primary"
            className="h-[48px] text-r-neutral-title2 text-15 font-medium"
            style={{
              height: 48,
            }}
            onClick={onDepositPress}
          >
            {t('page.gasAccount.deposit')}
          </Button>
        </TooltipWithMagnetArrow>
      </div>
    </GasAccountWrapperBg>
  );
};
