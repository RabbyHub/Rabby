import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import ClipboardJS from 'clipboard';
import BigNumber from 'bignumber.js';
import { message, Button, Form, Input, Modal } from 'antd';
import { useTranslation, Trans } from 'react-i18next';
import { AddressViewer } from 'ui/component';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { ellipsisOverflowedText } from 'ui/utils';
import { getCustomTxParamsData } from 'ui/utils/transaction';
import { splitNumberByStep } from 'ui/utils/number';
import { ExplainTxResponse, TokenItem, Tx } from 'background/service/openapi';
import BalanceChange from './BalanceChange';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';

interface ApproveProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  onChange(data: Record<string, string>): void;
  tx: Tx;
}

interface ApproveAmountModalProps {
  amount: number;
  token: TokenItem;
  onChange(value: string): void;
}

const ApproveAmountModal = ({
  amount,
  token,
  onChange,
}: ApproveAmountModalProps) => {
  const { t } = useTranslation();
  const [customAmount, setCustomAmount] = useState(
    new BigNumber(amount).toFixed()
  );
  const [tokenPrice, setTokenPrice] = useState(amount * token.price);
  const [canSubmit, setCanSubmit] = useState(false);
  const handleSubmit = () => {
    onChange(customAmount);
  };
  const handleChange = (value: string) => {
    if (/^\d*(\.\d*)?$/.test(value)) {
      setCustomAmount(value);
    }
  };

  useEffect(() => {
    if (
      !customAmount ||
      Number(customAmount) <= 0 ||
      Number.isNaN(Number(customAmount))
    ) {
      setCanSubmit(false);
    } else {
      setCanSubmit(true);
    }
    setTokenPrice(Number(customAmount || 0) * token.price);
  }, [customAmount]);

  return (
    <Form onFinish={handleSubmit}>
      <Form.Item>
        <Input
          value={customAmount}
          onChange={(e) => handleChange(e.target.value)}
          bordered={false}
          addonAfter={
            <span title={token.symbol}>
              {ellipsisOverflowedText(token.symbol, 4)}
            </span>
          }
          autoFocus
        />
      </Form.Item>
      <p
        className="est-approve-price"
        title={splitNumberByStep(new BigNumber(tokenPrice).toFixed(2))}
      >
        ≈ $
        {ellipsisOverflowedText(
          splitNumberByStep(new BigNumber(tokenPrice).toFixed(2)),
          18,
          true
        )}
      </p>
      <div className="flex justify-center mt-32">
        <Button
          type="primary"
          className="w-[200px]"
          size="large"
          htmlType="submit"
          disabled={!canSubmit}
        >
          {t('Confirm')}
        </Button>
      </div>
    </Form>
  );
};

const Approve = ({ data, chainEnum, onChange, tx }: ApproveProps) => {
  const detail = data.type_token_approval!;
  const chain = CHAINS[chainEnum];
  const [editApproveModalVisible, setEditApproveModalVisible] = useState(false);
  const { t } = useTranslation();
  const totalTokenPrice = new BigNumber(
    ((detail.token.raw_amount || 0) / Math.pow(10, detail.token.decimals)) *
      detail.token.price
  ).toFixed(2);
  const tokenAmount = new BigNumber(detail.token_amount).toFixed();

  const handleCopySpender = () => {
    const clipboard = new ClipboardJS('.approve', {
      text: function () {
        return detail.spender;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };

  const handleEditApproveAmount = () => {
    setEditApproveModalVisible(true);
  };

  const handleApproveAmountChange = (value: string) => {
    const result = new BigNumber(value).isGreaterThan(Number.MAX_SAFE_INTEGER)
      ? String(Number.MAX_SAFE_INTEGER)
      : value;
    const data = getCustomTxParamsData(tx.data, {
      customPermissionAmount: result,
      decimals: detail.token.decimals,
    });
    onChange({
      data,
    });
  };

  return (
    <div className="approve">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        <p className="title">{t('Token Approval')}</p>
        <div className="block-field">
          <span className="label">{t('Amount')}</span>
          <div className="value">
            <p className="token-info" title={splitNumberByStep(tokenAmount)}>
              <span>
                {ellipsisOverflowedText(
                  splitNumberByStep(tokenAmount),
                  15,
                  true
                )}{' '}
                <span title={detail.token_symbol}>
                  {ellipsisOverflowedText(detail.token_symbol, 4)}
                </span>
              </span>
              <Button type="link" onClick={handleEditApproveAmount}>
                {t('Edit')}
              </Button>
            </p>
            <p
              className="token-value"
              title={splitNumberByStep(totalTokenPrice)}
            >
              ≈ $
              {ellipsisOverflowedText(
                splitNumberByStep(totalTokenPrice),
                18,
                true
              )}
            </p>
          </div>
        </div>
        <div className="block-field mb-0">
          <span className="label flex items-center">{t('Approve to')}</span>
          <div className="value protocol">
            {detail.spender_protocol_logo_url && (
              <img
                className="protocol-logo"
                src={detail.spender_protocol_logo_url || IconUnknownProtocol}
                onError={handleProtocolLogoLoadFailed}
              />
            )}
            <div className="protocol-info">
              <p
                className={clsx('protocol-info__name flex', {
                  'text-gray-content': !detail.spender_protocol_name,
                })}
              >
                {ellipsisOverflowedText(
                  detail.spender_protocol_name || t('UnknownProtocol'),
                  10
                )}
                <span className="protocol-info__spender">
                  <AddressViewer address={detail.spender} showArrow={false} />
                  <img
                    src={IconCopy}
                    className="icon icon-copy"
                    onClick={handleCopySpender}
                  />
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
      <Modal
        visible={editApproveModalVisible}
        footer={null}
        className="edit-approve-amount-modal"
        title={t('Amount')}
        centered
        onCancel={() => setEditApproveModalVisible(false)}
        destroyOnClose
        width="90%"
      >
        <ApproveAmountModal
          amount={detail.token_amount}
          token={detail.token}
          onChange={handleApproveAmountChange}
        />
      </Modal>
    </div>
  );
};

export default Approve;
