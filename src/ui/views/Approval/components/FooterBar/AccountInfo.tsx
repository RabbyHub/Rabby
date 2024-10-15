import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { AddressViewer } from '@/ui/component';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { Chain } from '@debank/common';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';

export interface Props {
  account: Account;
  isTestnet?: boolean;
  chain?: Chain;
}

export const AccountInfo: React.FC<Props> = ({
  account,
  chain,
  isTestnet = false,
}) => {
  const [nickname, setNickname] = React.useState<string>();
  const { balance } = useCurrentBalance(account?.address);
  const displayBalance = splitNumberByStep((balance || 0).toFixed(2));
  const wallet = useWallet();
  const { t } = useTranslation();

  const init = async () => {
    const result = await wallet.getAlianName(
      account?.address?.toLowerCase() || ''
    );
    setNickname(result);
    checkIfNeedPassphrase();
  };

  const [needPassphrase, setNeedPassphrase] = React.useState(false);
  const checkIfNeedPassphrase = () => {
    if (account?.type === KEYRING_CLASS.MNEMONIC && account?.address) {
      wallet
        .getMnemonicKeyringIfNeedPassphrase('address', account.address)
        .then((result) => {
          setNeedPassphrase(result);
        });
    }
  };

  React.useEffect(() => {
    init();
  }, [account]);

  const brandIcon = useBrandIcon({
    address: account?.address,
    brandName: account?.brandName,
    type: account?.type,
  });

  const nicknameRef = React.useRef<HTMLDivElement>(null);
  const [enableTooltip, setEnableTooltip] = React.useState(false);

  React.useEffect(() => {
    if (nicknameRef.current) {
      setEnableTooltip(
        nicknameRef.current.offsetWidth < nicknameRef.current.scrollWidth
      );
    }
  }, [nickname]);

  return (
    <div
      className={clsx(
        'bg-r-neutral-card-3 rounded-[8px]',
        'py-[12px] px-[12px] mb-[12px]',
        'space-y-6'
      )}
    >
      <div
        className={clsx('flex items-center justify-between', 'h-18 gap-x-16')}
      >
        <div className="space-x-6 flex items-center overflow-hidden">
          <img src={brandIcon} className="w-18 h-18" />

          <Tooltip
            overlayClassName="rectangle w-[max-content]"
            title={nickname}
            trigger={enableTooltip ? 'hover' : ''}
          >
            <div
              ref={nicknameRef}
              className={clsx(
                'text-r-neutral-body text-[15px]',
                'overflow-ellipsis whitespace-nowrap overflow-hidden',
                'leading-[20px]'
              )}
            >
              {nickname}
            </div>
          </Tooltip>
          <AddressViewer
            showArrow={false}
            address={account.address}
            className={clsx('text-13 text-r-neutral-foot')}
          />
        </div>

        {isTestnet ? null : (
          <div
            className="text-13 font-normal text-r-neutral-foot"
            title={displayBalance}
          >
            ${displayBalance}
          </div>
        )}
      </div>
    </div>
  );
};
