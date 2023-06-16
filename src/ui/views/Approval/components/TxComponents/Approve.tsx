import { Button, Form, Input } from 'antd';
import { ExplainTxResponse, TokenItem, Tx } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM, KEYRING_TYPE } from 'consts';
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import { Popup } from 'ui/component';
import { ellipsisOverflowedText, useWallet } from 'ui/utils';
import { getTokenSymbol } from 'ui/utils/token';
import { splitNumberByStep } from 'ui/utils/number';
import { getCustomTxParamsData } from 'ui/utils/transaction';
import ViewRawModal from './ViewRawModal';
import useBalanceChange from '@/ui/hooks/useBalanceChange';
import { ApproveToken } from './ApproveToken';
import BalanceChange from './BalanceChange';

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
            <span title={getTokenSymbol(token)}>
              {ellipsisOverflowedText(getTokenSymbol(token), 4)}
            </span>
          }
          autoFocus
        />
      </Form.Item>
      <div className="approve-amount-footer overflow-hidden gap-[8px]">
        <span
          className="est-approve-price truncate"
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
            className="token-approve-balance truncate"
            title={splitNumberByStep(balance)}
            onClick={() => {
              setCustomAmount(balance);
            }}
          >
            Balance: {splitNumberByStep(new BigNumber(balance).toFixed(4))}
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

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
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
      currentAccount?.address || '',
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
    if (currentAccount) {
      fetchBalance();
    }
  }, [currentAccount, detail]);

  useEffect(() => {
    init();
  }, []);

  const bfInfo = useBalanceChange(data);

  return (
    <div
      className={clsx(
        'approve',
        bfInfo.belowBlockIsEmpty && 'below-bc-block-empty'
      )}
    >
      <div className="section-title">
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
      </div>
      <ApproveToken
        detail={detail!}
        isSpeedUp={isSpeedUp}
        onClickEdit={handleEditApproveAmount}
        onApproveAmountChange={() => handleApproveAmountChange(balance || '0')}
        balance={balance}
        chainEnum={chainEnum}
      >
        <BalanceChange
          version={data.pre_exec_version}
          data={data.balance_change}
          chainEnum={chainEnum}
          isSupport={data.support_balance_change}
        />
      </ApproveToken>
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
