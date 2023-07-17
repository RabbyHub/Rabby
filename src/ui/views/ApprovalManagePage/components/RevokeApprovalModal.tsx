import { NFTApproval, TokenItem } from '@/background/service/openapi';
import { NameAndAddress, TokenWithChain } from '@/ui/component';
import { Alert, Button, Modal } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NFTAvatar from '../../Dashboard/components/NFT/NFTAvatar';
import { ApprovalContractItem } from './ApprovalContractItem';
import IconUnknownNFT from 'ui/assets/unknown-nft.svg';
import { IconChecked, IconNotChecked } from '@/ui/assets';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import BigNumber from 'bignumber.js';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ApprovalItem, ApprovalSpenderItemToBeRevoked } from '@/utils/approval';
import { detectClientOS } from '@/ui/utils/os';
import styled from 'styled-components';
import { findIndexRevokeList, toRevokeItem } from '../utils';

const IS_WINDOWS = detectClientOS() === 'win32';

const ModalStyled = styled(Modal)`
  .ant-modal-header {
    border-bottom: none;
  }
`;

export const RevokeApprovalModal = (props: {
  item?: ApprovalItem;
  visible: boolean;
  onClose: () => void;
  className?: string;
  revokeList?: ApprovalSpenderItemToBeRevoked[];
  onConfirm: (items: ApprovalSpenderItemToBeRevoked[]) => void;
}) => {
  const { item, visible, onClose, className, revokeList, onConfirm } = props;
  const { t } = useTranslation();

  const [selectedList, setSelectedList] = useState<number[]>([]);

  const handleRevoke = async () => {
    if (item?.list) {
      const revokeList = selectedList
        .map((e) => {
          const token = item.list[e];
          return toRevokeItem(item, token);
        })
        .filter(Boolean) as ApprovalSpenderItemToBeRevoked[];

      onConfirm(revokeList);
      onClose();
    }
  };

  const handleSelectAll = () => {
    if (item?.list) {
      setSelectedList((e) =>
        e.length === item.list.length
          ? []
          : Array(item.list.length)
              .fill(0)
              .map((_, i) => i)
      );
    }
  };

  const subTitle = useMemo(() => {
    if (item?.type === 'contract') {
      return 'Approved Token and NFT';
    }
    return 'Approved to the following Contracts';
  }, [item?.type]);

  const displayList = useMemo(() => {
    if (!item) return null;
    if (item?.type === 'contract') {
      return item?.list.map((e, index) => {
        return (
          <div
            key={index}
            className={clsx(
              'relative px-[16px] h-[56px] flex justify-between items-center bg-white cursor-pointer  border border-transparent  hover:border-blue-light  hover:bg-blue-light hover:bg-opacity-[0.1] hover:rounded-[6px] hover:z-10',
              index === item.list.length - 1 && 'rounded-b-[6px]',
              index !== item.list.length - 1 &&
                'after:absolute after:h-[1px] after:left-[16px] after:right-[16px] after:bottom-0 after:bg-gray-divider',
              '-mt-1 first:mt-0'
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement)?.id !== 'copyIcon') {
                setSelectedList((l) =>
                  l.includes(index)
                    ? l.filter((e) => e !== index)
                    : [...l, index]
                );
              }
            }}
          >
            {'logo_url' in e ? (
              <TokenWithChain token={(e as unknown) as TokenItem} />
            ) : (
              <NFTAvatar
                className="w-[24px] h-[24px]"
                type={(e as NFTApproval)?.content_type || 'image'}
                content={
                  (e as NFTApproval)?.content ||
                  (e as any)?.collection?.logo_url
                }
                thumbnail
                chain={(e as NFTApproval)?.chain}
                unknown={IconUnknownNFT}
              />
            )}
            {/* <div className=""> */}
            {'spender' in e ? (
              <div className="flex flex-col ml-[8px]">
                <div className="text-13 font-medium leading-[15px] mb-2">
                  {e.contract_name}
                </div>
                <NameAndAddress.SafeCopy
                  className="justify-start"
                  address={e.contract_id || (e as NFTApproval).id}
                />
              </div>
            ) : (
              <div className="ml-[8px] text-13 font-medium leading-[15px]">
                {e.symbol}
              </div>
            )}

            <div className="ml-auto">
              <img
                src={
                  selectedList.includes(index) ? IconChecked : IconNotChecked
                }
                className="icon icon-checked w-[24px] h-[24px]"
              />
            </div>
          </div>
        );
      });
    }

    return item?.list.map((spender, index) => {
      const value = new BigNumber(spender.value || 0);
      const isUnlimited = value.gte(10 ** 9);
      const displayApprovalValue = isUnlimited
        ? 'Unlimited'
        : splitNumberByStep(value.toFixed(2));

      const risky = ['danger', 'warning'].includes(spender.risk_level);

      return (
        <div
          key={spender.id}
          className={clsx(
            'relative px-[16px] flex justify-between bg-white cursor-pointer  border border-transparent  hover:border-blue-light  hover:bg-blue-light hover:bg-opacity-[0.1] hover:rounded-[6px] hover:z-10',
            index === item.list.length - 1 && 'rounded-b-[6px]',
            index !== item.list.length - 1 &&
              'after:absolute after:h-[1px] after:left-[16px] after:right-[16px] after:bottom-0 after:bg-gray-divider',
            !risky ? 'h-[51px] ' : 'flex-col pt-[13px]'
          )}
          onClick={(e) => {
            if ((e.target as HTMLElement)?.id !== 'copyIcon') {
              setSelectedList((l) =>
                l.includes(index) ? l.filter((e) => e !== index) : [...l, index]
              );
            }
          }}
        >
          <div className="flex w-full justify-between items-center">
            <IconWithChain
              iconUrl={spender.protocol?.logo_url || IconUnknown}
              chainServerId={item.chain}
            />
            <div className="flex flex-col ml-[12px]">
              <div className="text-13 font-medium leading-[15px] mb-2">
                {spender.protocol?.name || 'Unknown Contract'}
              </div>
              <NameAndAddress.SafeCopy
                className="justify-start"
                addressClass="text-12"
                copyIconClass="w-[14px] h-[14px]"
                address={spender.id}
              />
            </div>

            <div className="ml-auto flex justify-center items-center">
              <span
                className={clsx(
                  'mr-[14px] text-[13px] text-gray-subTitle',
                  item.type !== 'token' && 'hidden'
                )}
              >
                {displayApprovalValue}
              </span>
              <img
                src={
                  selectedList.includes(index) ? IconChecked : IconNotChecked
                }
                className="icon icon-checked"
              />
            </div>
          </div>
          {risky && (
            <div className="pt-[8px] pb-[16px]">
              <Alert
                className={clsx(
                  'rounded-[4px] px-[8px] py-[3px]',
                  spender.risk_level === 'danger' ? 'bg-[#ec5151]' : 'bg-orange'
                )}
                icon={
                  <InfoCircleOutlined className="text-white pt-[4px] self-start" />
                }
                banner
                message={
                  <span className="text-12 text-white">
                    {spender.risk_alert}
                  </span>
                }
                type={'error'}
              />
            </div>
          )}
        </div>
      );
    });
  }, [item, selectedList]);

  useEffect(() => {
    setSelectedList([]);
    if (visible && item?.list && revokeList) {
      const indexes: number[] = [];

      item.list.forEach((token, index) => {
        if (findIndexRevokeList(revokeList, item, token) > -1) {
          indexes.push(index);
        }
      });

      setSelectedList(indexes);
    }
  }, [visible, revokeList, item]);

  if (!item) return null;

  return (
    <ModalStyled
      centered
      width={400}
      visible={visible}
      onCancel={onClose}
      className={clsx(
        IS_WINDOWS && 'revoke-approval-modal__windows',
        className
      )}
      bodyStyle={{
        height: '640px',
        maxHeight: '640px',
      }}
      destroyOnClose
      footer={null}
      title="Approvals"
    >
      <div>
        <div className="mt-16 mb-18">
          <ApprovalContractItem data={[item]} index={0} showNFTAmount />
        </div>

        <section className="mb-[6px] flex justify-between items-center">
          <span className="text-12 text-gray-title">{subTitle}</span>
          <div
            className="w-[67px] h-[22px] text-12 cursor-pointer flex items-center justify-center bg-blue-light bg-opacity-[0.2] text-center text-blue-light"
            onClick={handleSelectAll}
          >
            {t('Select All')}
          </div>
        </section>

        <section
          className={clsx(
            'max-h-[424px] overflow-hidden rounded-[6px] pb-[60px]',
            !IS_WINDOWS ? 'overflow-y-scroll' : 'overflow-y-overlay'
          )}
        >
          {displayList}
        </section>
      </div>
      <div
        className={clsx(
          'absolute flex flex-col items-center justify-center bg-white left-0 bottom-0 w-full z-[99999] border-t border-gray-divider',
          'h-[76px]'
        )}
      >
        <Button
          style={{
            width: 172,
            height: 44,
          }}
          type="primary"
          size="large"
          onClick={handleRevoke}
        >
          Confirm {selectedList.length > 0 ? `(${selectedList.length})` : ''}
        </Button>
      </div>
    </ModalStyled>
  );
};
