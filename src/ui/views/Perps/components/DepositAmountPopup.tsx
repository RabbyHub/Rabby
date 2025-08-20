import React from 'react';
import { Input, Button } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { TokenSelectPopup } from './TokenSelectPopup';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { queryTokensCache } from '@/ui/utils/portfolio/tokenUtils';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { ARB_USDC_TOKEN_ID, ARB_USDC_TOKEN_ITEM } from '../constants';
import { ARB_USDC_TOKEN_SERVER_CHAIN } from '../constants';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { TokenWithChain } from '@/ui/component';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

export type PerpsDepositAmountPopupProps = PopupProps & {
  onDeposit: (amount: number) => void;
  onChange: (amount: number) => void;
};

export const PerpsDepositAmountPopup: React.FC<PerpsDepositAmountPopupProps> = ({
  visible,
  onCancel,
  onDeposit,
  onChange,
  ...rest
}) => {
  const { t } = useTranslation();

  const [amount, setAmount] = React.useState<string>('');
  const [tokenVisible, setTokenVisible] = React.useState(false);
  const [selectedToken, setSelectedToken] = React.useState<TokenItem | null>(
    null
  );

  const wallet = useWallet();
  const account = useCurrentAccount();

  const { value: list, loading } = useAsync(async () => {
    if (!account?.address || !visible) return [];
    const res = await queryTokensCache(account.address, wallet, false);
    const usdcToken = res.find(
      (t) =>
        t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    setSelectedToken(usdcToken || ARB_USDC_TOKEN_ITEM);
    return res;
  }, [account?.address, visible]);

  React.useEffect(() => {
    if (!visible) {
      setAmount('');
      // 保留已选 token，避免每次重置选择
    }
  }, [visible]);

  return (
    <Popup
      placement="bottom"
      height={368}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onCancel}
      {...rest}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 mb-16 text-center mt-16">
          Deposit
        </div>
        <div className="flex flex-col bg-r-neutral-bg1 rounded-[8px] h-[200px]">
          <div className="px-16">
            <Input
              size="large"
              className="h-44 text-40 bg-transparent rounded-[12px] p-16 h-[152px] text-center"
              placeholder="$0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                onChange(Number(e.target.value));
              }}
            />
          </div>
          <div
            className="w-full flex items-center justify-between text-13 text-r-neutral-body px-16 h-[48px]
            border-t-[0.5px] border-solid border-rabby-neutral-line
            "
          >
            <div className="text-r-neutral-title-1 font-medium text-13">
              Pay With
            </div>
            {selectedToken ? (
              <div
                className="flex items-center cursor-pointer"
                onClick={() => setTokenVisible(true)}
              >
                <TokenWithChain
                  token={selectedToken}
                  hideConer
                  width="20px"
                  height="20px"
                />
                <div className="text-r-neutral-title-1 font-medium text-13 ml-4">
                  {formatUsdValue(
                    (selectedToken?.amount || 0) * (selectedToken?.price || 0)
                  )}
                </div>
                <ThemeIcon
                  className="icon icon-arrow-right ml-4"
                  src={RcIconArrowRight}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line flex items-center justify-center">
          <Button
            block
            disabled={!amount || Number(amount) < 5}
            size="large"
            type="primary"
            className="h-[48px] text-r-neutral-title2 text-15 font-medium"
            style={{
              height: 48,
            }}
            onClick={() => onDeposit(Number(amount))}
          >
            {t('page.perps.deposit')}
          </Button>
        </div>
      </div>

      <TokenSelectPopup
        visible={tokenVisible}
        list={list || []}
        onCancel={() => setTokenVisible(false)}
        onSelect={(t) => {
          setSelectedToken(t);
          setTokenVisible(false);
        }}
      />
    </Popup>
  );
};

export default PerpsDepositAmountPopup;
