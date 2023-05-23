import { ExplainTxResponse } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { AddressViewer, Copy } from 'ui/component';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import useBalanceChange from '@/ui/hooks/useBalanceChange';
import IconExternal from 'ui/assets/icon-share.svg';
import { openInTab } from '@/ui/utils';

interface CancelProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}

const Cancel = ({ data, chainEnum, isSpeedUp, raw }: CancelProps) => {
  const detail = data.type_cancel_token_approval!;
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();

  const handleClickSpender = () => {
    const chain = CHAINS[chainEnum];
    openInTab(
      chain.scanLink.replace(/tx\/_s_/, `address/${detail.spender}`),
      false
    );
  };

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
  };

  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };

  const bfInfo = useBalanceChange(data);

  return (
    <div
      className={clsx(
        'cancel',
        bfInfo.belowBlockIsEmpty && 'below-bc-block-empty'
      )}
    >
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
        <span
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('View Raw')}
          <img src={IconArrowRight} />
        </span>
      </p>
      <div className="action-card">
        <div className="common-detail-block">
          {isSpeedUp && <SpeedUpCorner />}
          <p className="title">
            <Trans
              i18nKey="cancelApprovalTitle"
              values={{ symbol: detail.token_symbol }}
            />
          </p>
          <div className="protocol">
            <img
              className="protocol-logo"
              src={detail.spender_protocol_logo_url || IconUnknownProtocol}
              onError={handleProtocolLogoLoadFailed}
            />
            <div className="protocol-info">
              <p
                className={clsx('protocol-info__name', {
                  'text-gray-content': !detail.spender_protocol_name,
                })}
              >
                {detail.spender_protocol_name || t('UnknownProtocol')}
              </p>
              <div className="protocol-info__spender">
                <AddressViewer address={detail.spender} showArrow={false} />
                <img
                  src={IconExternal}
                  className="icon icon-copy w-[14px] h-[14px]"
                  onClick={handleClickSpender}
                />
                <Copy
                  data={detail.spender}
                  variant="address"
                  className="ml-[6px]"
                ></Copy>
              </div>
            </div>
          </div>
        </div>
        <BalanceChange
          version={data.pre_exec_version}
          data={data.balance_change}
          chainEnum={chainEnum}
          isSupport={data.support_balance_change}
        />
      </div>
    </div>
  );
};

export default Cancel;
