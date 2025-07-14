import { TestnetChain } from '@/background/service/customTestnet';
import { ReactComponent as RcIconDelete } from '@/ui/assets/custom-testnet/cc-delete.svg';
import { ReactComponent as RcIconEdit } from '@/ui/assets/custom-testnet/icon-edit.svg';
import { Spin } from '@/ui/component';
import { DotSpacer } from '@/ui/component/DotSpacer';
import { TestnetChainLogo } from '@/ui/component/TestnetChainLogo';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { Avatar, Badge, Card, Flex, Strong, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { capitalize } from 'lodash';
import { Chain } from '@debank/common';
import { useChainList } from 'ui/views/CustomTestnet/hooks/useChainList';

export type TestnetChainWithRpcList = TestnetChain & { rpcList?: string[] };

export const CustomTestnetItem = ({
  className,
  item,
  onEdit,
  onRemove,
  onClick,
  editable,
  disabled,
  loading,
  chainData,
}: {
  className?: string;
  item: TestnetChainWithRpcList;
  onEdit?: (item: TestnetChainWithRpcList) => void;
  onRemove?: (item: TestnetChainWithRpcList) => void;
  onClick?: (item: TestnetChainWithRpcList) => void;
  editable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  chainData?: Chain | TestnetChain;
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const {
    data: chainListData,
    isLoading: chainListIsLoading,
    error: chainListError,
  } = useChainList();

  const chainItem = chainListData?.find((it) => it.chainId === item.id);

  return (
    <>
      <Card
        variant={'surface'}
        size={'1'}
        className={'hover:bg-[--accent-3] cursor-pointer'}
        onClick={() => {
          history.push({
            pathname: `/custom-testnet/chainlist-details/${item?.id}`,
          });
        }}
      >
        {/*<Link*/}
        {/*  // to={`/networks/explore/${chainId}`}*/}
        {/*  to={`/custom-testnet/chainlist-details/${item?.id}`}*/}
        {/*  color={'inherit'}*/}
        {/*  style={{ textDecoration: 'none' }}*/}
        {/*>*/}
        <Flex gap="3" align="center" width={'100%'}>
          <Avatar
            className={'p-1'}
            size="3"
            src={`https://icons.llamao.fi/icons/chains/rsz_${item.logo}.jpg`}
            // src={item.logo}
            radius="full"
            fallback={item.name?.trim().substring(0, 1).toUpperCase()}
          />
          <Flex justify={'between'} align={'center'} width={'100%'}>
            <Flex direction={'column'} gapY={'2'}>
              <Text
                as="div"
                size="3"
                weight="bold"
                className={'text-[--accent-12]'}
              >
                {item.name}
              </Text>
              <Flex direction={'row'} align={'center'} gapX={'2'}>
                {chainItem?.chainSlug && (
                  <>
                    <Text color="gray" size={'2'}>
                      <Strong>{capitalize(chainItem?.chainSlug)}</Strong>
                    </Text>
                    <DotSpacer />
                  </>
                )}
                <Text color="gray" size={'1'}>
                  <Strong>{item.nativeTokenSymbol}</Strong>
                </Text>
                <DotSpacer />
                <Text color="gray" size={'1'}>
                  {item?.id} ({item.hex})
                </Text>
              </Flex>
            </Flex>
          </Flex>
          {chainData && (
            <Badge color="grass" radius={'full'}>
              {chainData && 'Added'}
            </Badge>
          )}
        </Flex>
        {/*</Link>*/}
      </Card>

      {/*<div
        className={clsx(
          'flex items-center gap-[12px] px-[15px] py-[10px]',
          'border-[1px] border-transparent rounded-[6px]',
          disabled
            ? 'opacity-50'
            : 'hover:border-rabby-blue-default hover:bg-r-blue-light1 cursor-pointer',
          'group',
          className
        )}
        onClick={() => {
          onClick?.(item);
        }}
      >
        {item.logo ? (
          <img
            src={item.logo}
            alt=""
            className="flex-shrink-0 w-[28px] h-[28px] rounded-full"
          />
        ) : (
          <TestnetChainLogo name={item.name} className="flex-shrink-0" />
        )}
        <div className="min-w-0">
          <div className="text-[15px] leading-[18px] mb-[2px] font-medium text-r-neutral-title1">
            {item.name}
          </div>
          <div className="flex items-center gap-[16px]">
            <div className="text-[12px] leading-[14px] text-r-neutral-foot">
              {t('page.customTestnet.currency')}:{' '}
              <span className="text-r-neutral-body">
                {item.nativeTokenSymbol}
              </span>
            </div>
            <div className="text-[12px] leading-[14px] text-r-neutral-foot">
              {t('page.customTestnet.id')}:{' '}
              <span className="text-r-neutral-body">{item.id}</span>
            </div>
          </div>
        </div>
        {editable ? (
          <div className="group-hover:visible flex items-center gap-[12px] ml-auto invisible">
            <ThemeIcon
              src={RcIconEdit}
              className="cursor-pointer"
              onClick={() => {
                onEdit?.(item);
              }}
            ></ThemeIcon>
            <div className="cursor-pointer text-r-red-default">
              <RcIconDelete
                onClick={() => {
                  onRemove?.(item);
                }}
              />
            </div>
          </div>
        ) : null}
        {loading ? (
          <div className="ml-auto">
            <Spin size="small" className="mr-auto" />
          </div>
        ) : null}
      </div>*/}
    </>
  );
};
