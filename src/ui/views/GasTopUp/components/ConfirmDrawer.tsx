import { Button, Drawer, Space, Tooltip } from 'antd';
import React, { CSSProperties, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCss } from 'react-use';
import { ReactComponent as IconClose } from 'ui/assets/swap/modal-close.svg';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ChainWrapper } from '.';
import { Empty, TokenWithChain } from '@/ui/component';
import { TokenItem } from '@/background/service/openapi';
import { ReactComponent as IconBack } from 'ui/assets/back.svg';
import { splitNumberByStep } from '@/ui/utils';
import { ReactComponent as IconRightArrow } from '@/ui/assets/arrow-right-gray.svg';
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

      return (
        <Tooltip
          overlayClassName={clsx('rectangle')}
          placement="top"
          visible={
            new BigNumber(item.amount)
              .times(item.price)
              .lt(new BigNumber(cost).times(1.2))
              ? undefined
              : false
          }
          title={t('page.gasTopUp.InsufficientBalanceTips')}
        >
          <div
            key={item.id}
            style={style}
            className={clsx(
              'flex justify-between items-center cursor-pointer px-[20px] h-[52px] border border-transparent hover:border-blue-light rounded-[6px]',
              'text-13 font-medium text-gray-title',
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
              <span>
                {splitNumberByStep(item.amount?.toFixed(4))}{' '}
                {getTokenSymbol(item)}
              </span>
            </Space>
            <div>
              ${splitNumberByStep((item.amount * item.price || 0)?.toFixed(2))}
            </div>
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
      className={drawClassName}
      bodyStyle={{
        padding: '20px 0',
      }}
      push={false}
      closeIcon={null}
    >
      <div className="relative w-full bg-white">
        <div className="text-20 font-medium text-center text-gray-title ">
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
          className="text-gray-title"
        >
          ${new BigNumber(cost).times(1.2).toString(10)}
        </div>
        <div className="flex items-center">
          <span className="text-12 text-gray-content mr-4">
            {t('page.gasTopUp.Including-service-fee', {
              fee: new BigNumber(cost).times(0.2).toString(10),
            })}
          </span>

          <Tooltip
            overlayClassName={clsx('rectangle max-w-[360px] left-[20px]')}
            placement="bottom"
            title={t('page.gasTopUp.service-fee-tip')}
          >
            <IconInfo />
          </Tooltip>
        </div>

        <ChainWrapper
          className="w-[360px] h-[56px]  mt-32"
          onClick={() => {
            retry();
            setTokenModalVisible(true);
          }}
        >
          <div className="text-gray-title text-14">
            {token
              ? t('page.gasTopUp.Payment-Token')
              : t('page.gasTopUp.Select-payment-token')}
          </div>
          <div className="flex items-center ">
            {token ? (
              <>
                <TokenWithChain token={token} hideConer />
                <div className="ml-12 mr-[18px] text-gray-title text-15 font-medium">
                  {getTokenSymbol(token)}
                </div>
              </>
            ) : null}
            <IconRightArrow />
          </div>
        </ChainWrapper>

        <Button
          style={{
            width: 200,
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
              <IconBack
                className="cursor-pointer absolute top-1/2 -translate-y-1/2  left-[20px]"
                onClick={() => setTokenModalVisible(false)}
              />
              <div className="text-20 font-medium text-center text-gray-title ">
                {t('page.gasTopUp.Select-from-supported-tokens')}
              </div>
            </div>
            <div className="px-20">
              <div className="flex justify-between border-b-[0.5px] border-gray-divider text-12 text-gray-subTitle pt-[24px] pb-8">
                <div>
                  {t('page.gasTopUp.Token')} / {t('page.gasTopUp.Balance')}
                </div>
                <div>{t('page.gasTopUp.Value')}</div>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 relative">
            {!loading && list.length === 0 && (
              <Empty className="pt-[80px]">
                <div className="text-14 text-gray-subTitle mb-12">
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
                <div className="mt-12">{t('page.gasTopUp.Loading_Tokens')}</div>
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
