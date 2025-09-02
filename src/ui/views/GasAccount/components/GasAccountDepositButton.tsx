import { DirectSignToConfirmBtn } from '@/ui/component/ToConfirmButton';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMiniApprovalGas } from '@/ui/hooks/useMiniApprovalDirectSign';
import { findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from 'react-use';

export const GasAccountDepositButton = ({
  canUseDirectSubmitTx,
  disabled,
  topUpDirect,
  topUpOnSignPage,
  isDirectSignAccount,
  isPreparingSign,
  setIsPreparingSign,
  miniSignTxs,
  chainServerId,
  startDirectSigning,
  setDirectSubmit,
  setMiniApprovalVisible,
}: {
  miniSignTxs?: Tx[];
  isPreparingSign: boolean;
  setIsPreparingSign: (isPreparing: boolean) => void;
  startDirectSigning: () => void;
  canUseDirectSubmitTx: boolean;
  disabled: boolean;
  topUpOnSignPage: () => void;
  topUpDirect: () => void;
  isDirectSignAccount: boolean;
  chainServerId?: string;
  setDirectSubmit: (p: boolean) => void;
  setMiniApprovalVisible: (p: boolean) => void;
}) => {
  const currentAccount = useCurrentAccount();
  const { t } = useTranslation();

  const miniApprovalGas = useMiniApprovalGas();

  useDebounce(
    () => {
      if (
        isDirectSignAccount &&
        isPreparingSign &&
        miniSignTxs?.length &&
        chainServerId
      ) {
        const gasReadyContent =
          !!miniApprovalGas &&
          !miniApprovalGas.loading &&
          !!miniApprovalGas.gasCostUsdStr;

        if (gasReadyContent) {
          const gasError =
            gasReadyContent && miniApprovalGas?.showGasLevelPopup;
          const chainInfo = findChainByServerID(chainServerId)!;
          const gasTooHigh =
            !!gasReadyContent &&
            !!miniApprovalGas?.gasCostUsdStr &&
            new BigNumber(
              miniApprovalGas?.gasCostUsdStr?.replace(/\$/g, '')
            ).gt(chainInfo.enum === CHAINS_ENUM.ETH ? 10 : 1);

          if (gasError || gasTooHigh) {
            setDirectSubmit(false);
            setMiniApprovalVisible(true);
            setIsPreparingSign(false);
          } else {
            startDirectSigning();
            setIsPreparingSign(false);
          }
        }
      } else {
        setIsPreparingSign(false);
      }
    },
    300,
    [
      miniApprovalGas,
      setDirectSubmit,
      startDirectSigning,
      isDirectSignAccount,
      chainServerId,
      topUpOnSignPage,
      isPreparingSign,
      miniSignTxs,
      setIsPreparingSign,
    ]
  );

  return canUseDirectSubmitTx && currentAccount?.type ? (
    <>
      <DirectSignToConfirmBtn
        title={t('page.gasAccount.depositPopup.title')}
        onConfirm={topUpDirect}
        disabled={disabled}
        overwriteDisabled
        accountType={currentAccount.type}
      />
    </>
  ) : (
    <Button
      onClick={topUpOnSignPage}
      block
      size="large"
      type="primary"
      className="h-[48px] text-r-neutral-title2 text-15 font-medium"
      disabled={disabled}
    >
      {t('page.gasAccount.depositPopup.title')}
    </Button>
  );
};
