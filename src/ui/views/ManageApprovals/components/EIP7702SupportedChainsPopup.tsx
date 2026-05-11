import React from 'react';
import { useTranslation } from 'react-i18next';

import { Popup } from 'ui/component';
import { findChainByEnum } from '@/utils/chain';
import { EIP7702_REVOKE_SUPPORTED_CHAINS } from '../../DesktopProfile/components/ApprovalsTabPane/useEIP7702Approvals';
import clsx from 'clsx';

type EIP7702SupportedChainsPopupProps = {
  visible: boolean;
  onCancel: () => void;
};

export const EIP7702SupportedChainsPopup: React.FC<EIP7702SupportedChainsPopupProps> = ({
  visible,
  onCancel,
}) => {
  const { t } = useTranslation();
  const supportedChains = EIP7702_REVOKE_SUPPORTED_CHAINS;

  return (
    <Popup
      visible={visible}
      onCancel={onCancel}
      closable
      height={474}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
    >
      <div
        className={clsx(
          'bg-r-neutral-bg-2 rounded-t-[16px] h-full px-[20px]',
          'flex flex-col'
        )}
      >
        <header className="py-[14px]">
          <div className="text-[20px] leading-[24px] font-medium text-center text-r-neutral-title1">
            Supported Chains
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[20px]">
          <div className="bg-r-neutral-card-1 rounded-[8px]">
            {supportedChains.map((chainEnum) => {
              const chain = findChainByEnum(chainEnum);
              return (
                <div
                  key={chainEnum}
                  className="flex items-center gap-[8px] rounded-[8px] px-[16px] py-[10px]"
                >
                  {chain?.logo ? (
                    <img
                      src={chain.logo}
                      className="h-[20px] w-[20px] rounded-full"
                    />
                  ) : null}
                  <span className="text-[13px] leading-[16px] font-medium text-r-neutral-title-1">
                    {chain?.name || chainEnum}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Popup>
  );
};
