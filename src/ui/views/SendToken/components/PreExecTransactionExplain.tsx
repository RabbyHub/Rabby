import React from 'react';
import { ExplainTxResponse } from '@rabby-wallet/rabby-api/dist/types';
import { Trans, useTranslation } from 'react-i18next';

import { splitNumberByStep } from '@/ui/utils';

import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconUser from 'ui/assets/address-management.svg';
import { Button } from 'antd';
import styled from 'styled-components';
import clsx from 'clsx';

const ExplainParagraph = styled.p`
  &.tx-explain {
    display: flex;
    align-items: center;
    margin-bottom: 0;
    & > span {
      flex: 1;
      font-weight: 500;
      font-size: 15px;
      line-height: 18px;
      color: @color-title;
    }
    .icon-explain {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }
    .tx-explain__view {
      padding: 4px 12px;
      border-radius: 2px;
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: #ffffff;
      height: auto;
    }
  }
`;

export const PreExecTransactionExplain = ({
  explain,
  onView,
  isViewLoading,
  className,
}: {
  explain: ExplainTxResponse;
  isViewLoading: boolean;
  onView?(): void;
  className?: string;
}) => {
  const { t } = useTranslation();
  let icon: React.ReactNode = (
    <img className="icon icon-explain" src={IconUnknown} />
  );
  let content: string | React.ReactNode = t('page.safeQueue.unknownTx');

  if (explain) {
    if (explain.type_cancel_token_approval) {
      icon = (
        <img
          src={
            explain.type_cancel_token_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.safeQueue.cancelExplain"
          values={{
            token: explain.type_cancel_token_approval.token_symbol,
            protocol:
              explain.type_cancel_token_approval.spender_protocol_name ||
              t('page.safeQueue.unknownProtocol'),
          }}
        />
      );
    }
    if (explain.type_token_approval) {
      icon = (
        <img
          src={
            explain.type_token_approval.spender_protocol_logo_url || IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.safeQueue.approvalExplain"
          values={{
            token: explain.type_token_approval.token_symbol,
            count: explain.type_token_approval.is_infinity
              ? t('page.safeQueue.unlimited')
              : splitNumberByStep(explain.type_token_approval.token_amount),
            protocol:
              explain.type_token_approval.spender_protocol_name ||
              t('page.safeQueue.unknownProtocol'),
          }}
        />
      );
    }
    if (explain.type_send) {
      icon = <img className="icon icon-explain" src={IconUser} />;
      content = `${t('page.safeQueue.action.send')} ${splitNumberByStep(
        explain.type_send.token_amount
      )} ${explain.type_send.token_symbol}`;
    }
    if (explain.type_call) {
      icon = (
        <img
          src={explain.type_call.contract_protocol_logo_url || IconUnknown}
          className="icon icon-explain"
        />
      );
      content = explain.type_call.action;
    }
  }

  return (
    <ExplainParagraph className={clsx('tx-explain', className)}>
      {icon || <img className="icon icon-explain" src={IconUnknown} />}
      <span>{content || t('page.safeQueue.unknownTx')}</span>
      {/* <Button
        type="primary"
        className="tx-explain__view"
        onClick={onView}
        loading={isViewLoading}
      >
        {t('page.safeQueue.viewBtn')}
      </Button> */}
    </ExplainParagraph>
  );
};
