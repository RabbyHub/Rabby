import { Button, Drawer, Space, Tooltip } from 'antd';
import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCss } from 'react-use';
import { ReactComponent as IconClose } from 'ui/assets/swap/modal-close.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ChainWrapper } from '.';
import { Empty, TokenWithChain } from '@/ui/component';
import { TokenItem } from '@/background/service/openapi';
import { ReactComponent as RcIconBack } from 'ui/assets/back-cc.svg';
import { formatUsdValue } from '@/ui/utils';
import { ReactComponent as RcIconRightArrow } from '@/ui/assets/arrow-right-cc.svg';
import { SvgIconLoading } from 'ui/assets';
import { FixedSizeList } from 'react-window';
import { getTokenSymbol } from '@/ui/utils/token';

export const ConfirmDrawer = ({
  visible,
  onClose,
  cost,
  token,
  list = [],
  loading = false,
  onChange,
  onConfirm,
  retry,
}: {
  visible: boolean;
  onClose: () => void;
  cost: string;
  list?: TokenItem[];
  token?: TokenItem;
  loading?: boolean;
  onChange: (t: TokenItem) => void;
  onConfirm: () => void;
  retry: () => void;
}) => {
  const { t } = useTranslation();
  const drawClassName = useCss({
    '& .ant-drawer-content': {
      boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
      borderRadius: '16px 16px 0px 0',
    },
  });

  const [tokenModalVisible, setTokenModalVisible] = useState(false);

  const Row = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: TokenItem[];
      style: CSSProperties;
    }) => {
      const item = data[index];
      const disabled = new BigNumber(item.amount)
        .times(item.price)
        .lt(new BigNumber(cost).times(1.2));

      return (
        <Tooltip
          overlayClassName={clsx('rectangle')}
          placement="top"
          visible={disabled ? undefined : false}
          title={t('page.gasTopUp.InsufficientBalanceTips')}
          align={{ targetOffset: [0, -30] }}
        >
          <div
            key={item.id}
            style={style}
            className={clsx(
              'flex justify-between items-center cursor-pointer px-[20px] h-[52px] border border-transparent  rounded-[6px]',
              'text-13 font-medium text-r-neutral-title-1',
              !disabled && 'hover:border-blue-light',
              new BigNumber(item.amount)
                .times(item.price)
                .lt(new BigNumber(cost).times(1.2)) &&
                'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              if (
                new BigNumber(item.amount)
                  .times(item.price)
                  .gte(new BigNumber(cost).times(1.2))
              ) {
                onChange(item);
                setTokenModalVisible(false);
              }
            }}
          >
            <Space size={12}>
              <TokenWithChain token={item} hideConer />
              <span>{getTokenSymbol(item)}</span>
            </Space>
            <div>{formatUsdValue(item.amount * item.price || 0)}</div>
          </div>
        </Tooltip>
      );
    },
    [cost, onChange]
  );

  return (
    <Drawer
      placement="bottom"
      height={346}
      visible={visible}
      onClose={onClose}
      className={clsx(drawClassName, 'is-support-darkmode')}
      bodyStyle={{
        padding: '20px 0',
      }}
      push={false}
      closeIcon={null}
    >
      <div className="relative w-full">
        <div className="text-20 font-medium text-center text-r-neutral-title-1 ">
          {t('page.gasTopUp.payment')}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2  right-[20px]">
          <IconClose className="cursor-pointer" onClick={onClose} />
        </div>
      </div>
      <div className="flex flex-col items-center mt-32">
        <div
          style={{
            fontWeight: 700,
            fontSize: 28,
          }}
          className="text-r-neutral-title-1"
        >
          ${new BigNumber(cost).times(1.2).toString(10)}
        </div>
        <div className="flex items-center">
          <span className="text-12 text-r-neutral-body mr-4">
            {t('page.gasTopUp.Including-service-fee', {
              fee: '$' + new BigNumber(cost).times(0.2).toString(10),
            })}
          </span>

          <Tooltip
            overlayClassName={clsx('rectangle max-w-[360px] left-[20px]')}
            placement="bottom"
            title={t('page.gasTopUp.service-fee-tip')}
          >
            <RcIconInfo className="text-r-neutral-body" />
          </Tooltip>
        </div>

        <ChainWrapper
          className="w-[360px] h-[56px]  mt-32"
          onClick={() => {
            retry();
            setTokenModalVisible(true);
          }}
        >
          <div className="text-r-neutral-title-1 text-14">
            {token
              ? t('page.gasTopUp.Payment-Token')
              : t('page.gasTopUp.Select-payment-token')}
          </div>
          <div className="flex items-center ">
            {token ? (
              <>
                <TokenWithChain token={token} hideConer />
                <div className="ml-12 mr-[18px] text-r-neutral-title-1 text-15 font-medium">
                  {getTokenSymbol(token)}
                </div>
              </>
            ) : null}
            <RcIconRightArrow className="text-r-neutral-body" />
          </div>
        </ChainWrapper>

        <Button
          style={{
            width: 360,
            height: 44,
            marginTop: 40,
          }}
          type="primary"
          size="large"
          onClick={onConfirm}
          disabled={!token}
        >
          {t('page.gasTopUp.Confirm')}
        </Button>
      </div>

      <Drawer
        placement="right"
        width={'100%'}
        visible={tokenModalVisible}
        onClose={() => setTokenModalVisible(false)}
        className={drawClassName}
        getContainer={false}
        bodyStyle={{
          padding: 0,
        }}
        contentWrapperStyle={{
          boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
          borderRadius: '16px 16px 0px 0',
          height: 500,
        }}
        closeIcon={null}
      >
        <div className="flex flex-col h-full pt-20">
          <div>
            <div className="relative flex justify-center items-center text-center">
              <RcIconBack
                className="cursor-pointer absolute top-1/2 -translate-y-1/2 left-[20px] text-r-neutral-title1 w-[20px] h-[20px]"
                onClick={() => setTokenModalVisible(false)}
              />
              <div className="text-20 font-medium text-center text-r-neutral-title-1 ">
                {t('page.gasTopUp.Select-from-supported-tokens')}
              </div>
            </div>
            <div className="px-20">
              <div className="flex justify-between border-b-[0.5px] border-rabby-neutral-line text-12 text-r-neutral-body pt-[24px] pb-8">
                <div>{t('page.gasTopUp.Token')}</div>
                <div>{t('page.gasTopUp.Value')}</div>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 relative">
            {!loading && list.length === 0 && (
              <Empty className="pt-[80px]">
                <div className="text-14 text-r-neutral-body mb-12">
                  {t('page.gasTopUp.No_Tokens')}
                </div>
              </Empty>
            )}
            {loading && (
              <div className="flex flex-col items-center justify-center pt-[80px]">
                <SvgIconLoading
                  className="animate-spin"
                  fill="var(--r-blue-default, #7084ff)"
                />
                <div className="mt-12 text-r-neutral-title-1">
                  {t('page.gasTopUp.Loading_Tokens')}
                </div>
              </div>
            )}

            {!loading && (
              <FixedSizeList
                width={'100%'}
                height={402}
                itemCount={list.length}
                itemData={list}
                itemSize={52}
              >
                {Row}
              </FixedSizeList>
            )}
          </div>
        </div>
      </Drawer>
    </Drawer>
  );
};

export default ConfirmDrawer;
