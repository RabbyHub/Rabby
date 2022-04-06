import { Button, Form, Input, message } from 'antd';
import { ExplainTxResponse, TokenItem, Tx } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM, KEYRING_TYPE } from 'consts';
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconCopy from 'ui/assets/address-copy.png';
import IconSuccess from 'ui/assets/success.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { AddressViewer, Popup } from 'ui/component';
import { ellipsisOverflowedText, useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { getCustomTxParamsData } from 'ui/utils/transaction';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';

interface ApproveProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  onChange(data: Record<string, string>): void;
  tx: Tx;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}

interface ApproveAmountModalProps {
  amount: number;
  balance: string | undefined | null;
  token: TokenItem;
  onChange(value: string): void;
}

const ApproveAmountModal = ({
  balance,
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
      <div className="approve-amount-footer">
        <span
          className="est-approve-price"
          title={splitNumberByStep(new BigNumber(tokenPrice).toFixed(2))}
        >
          ≈ $
          {ellipsisOverflowedText(
            splitNumberByStep(new BigNumber(tokenPrice).toFixed(2)),
            18,
            true
          )}
        </span>
        {balance && (
          <span
            className="token-approve-balance"
            title={splitNumberByStep(balance)}
            onClick={() => {
              setCustomAmount(balance);
            }}
          >
            {splitNumberByStep(new BigNumber(balance).toFixed(4))}
          </span>
        )}
      </div>
      <div className="flex justify-center mt-32 popup-footer">
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

const Approve = ({
  data,
  chainEnum,
  onChange,
  tx,
  isSpeedUp,
  raw,
}: ApproveProps) => {
  const wallet = useWallet();
  const detail = data.type_token_approval!;
  const chain = CHAINS[chainEnum];
  const [editApproveModalVisible, setEditApproveModalVisible] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isGnosis, setIsGnosis] = useState(false);
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

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abiStr,
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

  const init = async () => {
    const account = await wallet.getCurrentAccount();
    setCurrentAccount(account);
  };

  const fetchBalance = async () => {
    const userToken: TokenItem = await wallet.openapi.getToken(
      currentAccount?.address,
      detail.token.chain,
      detail.token.id
    );
    setBalance(
      new BigNumber(userToken.raw_amount_hex_str || 0)
        .div(new BigNumber(10).pow(userToken.decimals))
        .toFixed()
    );
  };

  useEffect(() => {
    if (currentAccount) {
      setIsGnosis(currentAccount.type === KEYRING_TYPE.GnosisKeyring);
    }
  }, [currentAccount]);

  useEffect(() => {
    fetchBalance();
  }, [currentAccount, detail]);

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="approve">
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
      <div className="gray-section-block common-detail-block">
        {isSpeedUp && <SpeedUpCorner />}
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
              {!isGnosis && (
                <Button
                  type="link"
                  onClick={handleEditApproveAmount}
                  className="edit-btn"
                >
                  {t('Edit')}
                </Button>
              )}
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
      <Popup
        visible={editApproveModalVisible}
        className="edit-approve-amount-modal"
        height={280}
        title={t('Amount')}
        onCancel={() => setEditApproveModalVisible(false)}
        destroyOnClose
      >
        <ApproveAmountModal
          balance={balance}
          amount={detail.token_amount}
          token={detail.token}
          onChange={handleApproveAmountChange}
        />
      </Popup>
    </div>
  );
};

export default Approve;
