import { NFTApproval, TokenItem } from '@/background/service/openapi';
import { TokenWithChain } from '@/ui/component';
import { Alert, Button, Modal, Tooltip } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NFTAvatar from '../../Dashboard/components/NFT/NFTAvatar';
import { ApprovalContractItem } from './ApprovalContractItem';
import IconUnknownNFT from 'ui/assets/unknown-nft.svg';
import { ReactComponent as RcIconCheckboxChecked } from '../icons/check-checked.svg';
import { ReactComponent as RcIconCheckboxUnchecked } from '../icons/check-unchecked.svg';
import { formatNumber } from '@/ui/utils';
import clsx from 'clsx';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import IconUnknown from 'ui/assets/icon-unknown-1.svg';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { ApprovalItem, getSpenderApprovalAmount } from '@/utils/approval';
import styled from 'styled-components';
import ApprovalsNameAndAddr from './NameAndAddr';
import {
  decodeRevokeItem,
  encodeRevokeItem,
  isSameRevokeItem,
  maybeNFTLikeItem,
  openScanLinkFromChainItem,
  toRevokeItem,
} from '../utils';
import { findChainByServerID } from '@/utils/chain';
import { Chain } from '@debank/common';

import { ReactComponent as RcIconClose } from 'ui/assets/swap/modal-close.svg';
import { ReactComponent as RcIconExternal } from '../icons/icon-share-cc.svg';
import { ensureSuffix } from '@/utils/string';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { NFTItemBadge, Permit2Badge } from './Badges';
import { getTokenSymbol } from '@/ui/utils/token';
import { appIsDebugPkg } from '@/utils/env';

const BOTTOM_BUTTON_AREA = 76;
const ModalStyled = styled(Modal)`
  .ant-modal-header {
    border-bottom: none;
  }

  .ant-modal-body {
    padding-top: 16px;
    padding-bottom: ${BOTTOM_BUTTON_AREA}px;
  }
`;

function ApprovalAmountInfo({
  className,
  amountValue,
  balanceNumText,
  balanceUnitText,
  minWidthLimit,
}: {
  className?: string;
  amountValue: string | number;
  balanceNumText: string | number;
  balanceUnitText: string;
  minWidthLimit?: boolean;
}) {
  const { t } = useTranslation();

  const amountText = useMemo(() => {
    return formatNumber(amountValue);
  }, [amountValue]);

  const balanceText = useMemo(() => {
    return `${balanceNumText} ${balanceUnitText}`;
  }, [balanceNumText, balanceUnitText]);

  return (
    <div
      className={clsx(
        'approval-amount-info text-right flex flex-col justify-center',
        className
      )}
    >
      {amountText && (
        <div>
          <Tooltip
            overlayClassName="J-modal-item__tooltip disable-ant-overwrite"
            // Approved Amount
            overlay={t(
              'page.approvals.tableConfig.byAssets.columnCell.approvedAmount.tipApprovedAmount'
            )}
            align={{ offset: [0, 3] }}
            arrowPointAtCenter
          >
            <span className="text-12 font-medium text-r-neutral-body block max-w-[200px] truncate">
              {amountText}
            </span>
          </Tooltip>
        </div>
      )}

      {balanceText && (
        <Tooltip
          overlayClassName={clsx(
            'J-modal-item__tooltip disable-ant-overwrite',
            minWidthLimit && 'min-width-limit'
          )}
          // My Balance
          overlay={`${t(
            'page.approvals.tableConfig.byAssets.columnCell.approvedAmount.tipMyBalance'
          )}: ${balanceText}`}
          align={{ offset: [0, 3] }}
          arrowPointAtCenter
        >
          <div className="text-12 font-nomral text-r-neutral-foot inline-flex justify-end">
            <span className="whitespace-pre max-w-[8em] overflow-hidden overflow-ellipsis flex-shrink-1">
              {balanceNumText}
            </span>
            <span className="flex-shrink-0">{balanceUnitText}</span>
          </div>
        </Tooltip>
      )}
    </div>
  );
}

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

  const [selectedSet, setSelectedSet] = useState<Set<string>>(
    new Set<string>()
  );
  const selectedIdxes = useMemo(() => {
    const idxes: number[] = [];
    if (!selectedSet.size) return idxes;
    item?.list.forEach((spenderHost, index) => {
      const revokeItem = toRevokeItem(item, spenderHost, true);
      if (revokeItem && selectedSet.has(encodeRevokeItem(revokeItem))) {
        idxes.push(index);
      }
    }, []);

    return idxes;
  }, [item, selectedSet]);

  const handleConfirm = async () => {
    if (item?.list) {
      const revokeList = [...selectedSet]
        .map((key) => {
          return decodeRevokeItem(key);
        })
        .filter(Boolean);

      onConfirm(revokeList);
      onClose();
    }
  };

  const isSelectedAll = useMemo(() => {
    return item?.list.every((spenderHost) => {
      const revokeItem = toRevokeItem(item, spenderHost, true);
      if (!revokeItem) return false;
      return selectedSet.has(encodeRevokeItem(revokeItem));
    });
  }, [item, selectedSet]);

  const handleSelectAll = useCallback(() => {
    if (item?.list) {
      setSelectedSet(() => {
        const set = new Set<string>();
        if (isSelectedAll) {
          return set;
        }

        item.list.forEach((spenderHost) => {
          const revokeItem = toRevokeItem(item, spenderHost, true);
          if (revokeItem) {
            set.add(encodeRevokeItem(revokeItem));
          }
        });

        return set;
      });
    }
  }, [isSelectedAll, item]);

  const subTitle = useMemo(() => {
    if (item?.type === 'contract') {
      // return 'Approved Token and NFT';
      return t('page.approvals.RevokeApprovalModal.subTitleTokenAndNFT');
    }
    // return 'Approved to the following Contracts';
    return t('page.approvals.RevokeApprovalModal.subTitleContract');
  }, [item?.type, t]);

  const displayList = useMemo(() => {
    if (!item) return null;
    if (item?.type === 'contract') {
      return item?.list.map((spenderHost, index) => {
        const isLastOne = index === item.list.length - 1;
        const chainItem = findChainByServerID(spenderHost.chain);

        const maybeContractForNFT = maybeNFTLikeItem(spenderHost);

        const itemName = !maybeContractForNFT
          ? getTokenSymbol(spenderHost)
          : 'inner_id' in spenderHost
          ? ensureSuffix(
              spenderHost.contract_name || 'Unknown',
              ` #${spenderHost.inner_id}`
            )
          : spenderHost.contract_name || 'Unknown';
        /**
         * @description
         * 1. In general, the items from [host].spenders/[host].spender have same properties about nft/nft-collection/amounts, so we just need to check the first of them
         * 2. It must not be non-token type contract
         */
        const associatedSpender =
          '$indexderSpender' in spenderHost
            ? spenderHost.$indexderSpender
            : null;

        const spenderValues = associatedSpender
          ? getSpenderApprovalAmount(associatedSpender)
          : null;

        const revokeItem = toRevokeItem(item, spenderHost, true);
        if (!revokeItem && appIsDebugPkg) {
          console.warn('Revoke item is not found', item, spenderHost);
        }
        const revokeKey = !revokeItem ? '' : encodeRevokeItem(revokeItem);
        const isSelected = !revokeKey ? false : selectedSet.has(revokeKey);

        /**
         * you should find the contract spender from [host].spenders for `permit2_id`
         */

        return (
          <div
            key={index}
            className={clsx(
              'relative px-[16px] h-[56px] bg-r-neutral-card1 cursor-pointer border border-transparent  hover:border-rabby-blue-default  hover:bg-r-blue-light1 hover:bg-opacity-[0.1] hover:rounded-[6px] hover:z-10',
              isLastOne && 'rounded-b-[6px]',
              'first:mt-0 first:rounded-t-[6px] dark:bg-[#292c37] dark:hover:bg-r-blue-light1'
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement)?.id !== 'copyIcon') {
                setSelectedSet((prev) => {
                  if (isSelected) {
                    prev.delete(revokeKey);
                  } else {
                    prev.add(revokeKey);
                  }
                  return new Set([...prev]);
                });
              }
            }}
          >
            <div
              className={clsx(
                'flex justify-between items-center h-[100%]',
                !isLastOne &&
                  'border-b-rabby-neutral-line border-b-[0.5px] border-b-solid'
              )}
            >
              {'logo_url' in spenderHost ? (
                <TokenWithChain
                  width="24px"
                  height="24px"
                  hideChainIcon
                  token={(spenderHost as unknown) as TokenItem}
                />
              ) : (
                <NFTAvatar
                  className="w-[24px] h-[24px]"
                  type={(spenderHost as NFTApproval)?.content_type || 'image'}
                  content={
                    (spenderHost as NFTApproval)?.content ||
                    (spenderHost as any)?.collection?.logo_url
                  }
                  thumbnail
                  // chain={(spenderHost as NFTApproval)?.chain}
                  unknown={IconUnknownNFT}
                />
              )}
              {'spender' in spenderHost ? (
                <div className="flex flex-col ml-[8px]">
                  <div className="text-13 text-r-neutral-title1 font-medium leading-[15px] inline-flex items-center justify-start">
                    <span className="inline-block whitespace-nowrap max-w-[180px] overflow-hidden overflow-ellipsis">
                      {itemName}
                    </span>

                    {maybeContractForNFT && (
                      <ThemeIcon
                        onClick={(evt) => {
                          evt.stopPropagation();
                          openScanLinkFromChainItem(
                            chainItem?.scanLink,
                            spenderHost.spender.id
                          );
                        }}
                        src={RcIconExternal}
                        className={clsx(
                          'w-[12px] h-[12px] ml-6 cursor-pointer flex-shrink-0'
                        )}
                      />
                    )}
                  </div>
                  <NFTItemBadge
                    className="mt-2"
                    contractListItem={spenderHost}
                  />
                </div>
              ) : (
                <div className="ml-[8px] text-13 text-r-neutral-title1 font-medium leading-[15px]">
                  {getTokenSymbol(spenderHost)}
                </div>
              )}
              {associatedSpender?.permit2_id && (
                <Permit2Badge
                  className="ml-[9px]"
                  contractSpender={associatedSpender}
                />
              )}

              <div className="ml-auto flex items-center justify-between flex-shrink-0">
                <ApprovalAmountInfo
                  className="mr-[8px]"
                  {...(spenderValues
                    ? {
                        amountValue: spenderValues.displayAmountText,
                        balanceNumText: spenderValues.balanceNumText,
                        balanceUnitText: spenderValues.balanceUnitText,
                        minWidthLimit: spenderValues.isCollectionHasNFTs,
                      }
                    : {
                        amountValue:
                          'amount' in spenderHost ? spenderHost.amount : '',
                        balanceNumText: '',
                        balanceUnitText: '',
                      })}
                />
                <ThemeIcon
                  src={
                    isSelected ? RcIconCheckboxChecked : RcIconCheckboxUnchecked
                  }
                  className="icon icon-checked w-[20px] h-[20px]"
                />
              </div>
            </div>
          </div>
        );
      });
    }

    // in fact, it's impossible to reach here because all items passed to this components are contract
    return item?.list.map((spender, index) => {
      const risky = ['danger', 'warning'].includes(spender.risk_level);
      const chainItem = findChainByServerID(spender.chain as Chain['serverId']);

      const fullName =
        spender.type === 'nft' && spender.nftToken
          ? ensureSuffix(
              spender.name || 'Unknown',
              ` #${spender.nftToken.inner_id}`
            )
          : spender.name || 'Unknown';

      const spendValues = spender ? getSpenderApprovalAmount(spender) : null;
      const isLastOne = index === item.list.length - 1;
      const revokeItem = toRevokeItem(item, spender, true);
      const revokeKey = revokeItem ? encodeRevokeItem(revokeItem) : '';

      return (
        <div
          key={spender.id}
          className={clsx(
            'relative px-[16px] bg-r-neutral-card1 cursor-pointer border border-transparent hover:border-rabby-blue-default  hover:bg-r-blue-light1 hover:bg-opacity-[0.1] hover:rounded-[6px] hover:z-10',
            isLastOne && 'rounded-b-[6px]',
            'first:rounded-t-[6px]',
            !risky ? 'h-[51px] ' : 'flex-col pt-[13px]'
          )}
          onClick={(e) => {
            if ((e.target as HTMLElement)?.id !== 'copyIcon') {
              setSelectedSet((prev) => {
                if (prev.has(revokeKey)) {
                  prev.delete(revokeKey);
                } else {
                  prev.add(revokeKey);
                }
                return new Set([...prev]);
              });
            }
          }}
        >
          <div
            className={clsx(
              'flex justify-between items-center h-[100%]',
              !isLastOne &&
                'border-b-rabby-neutral-line border-b-[0.5px] border-b-solid'
            )}
          >
            <div className="flex w-full justify-between items-center">
              <IconWithChain
                width="16px"
                height="16px"
                hideChainIcon
                iconUrl={chainItem?.logo || IconUnknown}
                chainServerId={item.chain}
              />
              <div className="flex flex-col ml-[12px]">
                <div className="text-13 text-r-neutral-title1 font-medium leading-[15px] mb-2">
                  {fullName}
                </div>
                <ApprovalsNameAndAddr
                  className="justify-start"
                  addressClass="text-12"
                  copyIconClass="w-[14px] h-[14px]"
                  address={spender.id}
                />
              </div>

              <div className="ml-auto flex justify-center items-center flex-shrink-0">
                {item.type === 'token' && spendValues && (
                  <ApprovalAmountInfo
                    amountValue={spendValues.displayAmountText}
                    balanceNumText={spendValues.balanceNumText}
                    balanceUnitText={spendValues.balanceUnitText}
                    minWidthLimit={false}
                  />
                )}
                <ThemeIcon
                  src={
                    selectedSet.has(revokeKey)
                      ? RcIconCheckboxChecked
                      : RcIconCheckboxUnchecked
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
                    spender.risk_level === 'danger'
                      ? 'bg-[#ec5151]'
                      : 'bg-orange'
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
        </div>
      );
    });
  }, [item, selectedSet]);

  useEffect(() => {
    setSelectedSet(new Set());
    if (visible && item?.list && revokeList) {
      const set = new Set<string>();

      item.list.forEach((token) => {
        const revokeItem = toRevokeItem(item, token, true);
        if (!revokeItem) return;

        if (revokeList.find((revoke) => isSameRevokeItem(revoke, revokeItem))) {
          set.add(encodeRevokeItem(revokeItem));
        }
      });

      setSelectedSet(set);
    }
  }, [visible, revokeList, item]);

  if (!item) return null;

  return (
    <ModalStyled
      centered
      width={480}
      visible={visible}
      onCancel={onClose}
      className={clsx(
        'revoke-approval-modal modal-support-darkmode',
        className
      )}
      bodyStyle={{
        height: '640px',
        maxHeight: '640px',
      }}
      destroyOnClose
      footer={null}
      title={t('page.approvals.RevokeApprovalModal.title')}
      closeIcon={<RcIconClose />}
    >
      <div className="flex flex-col h-[100%]">
        <div className="mt-0 mb-0 flex-shrink-0">
          <ApprovalContractItem data={[item]} index={0} />
        </div>

        <section className="mb-[6px] flex justify-between items-center flex-shrink-0">
          <span className="text-12 text-r-neutral-title1">{subTitle}</span>
          <div
            className={clsx(
              isSelectedAll ? 'w-[80px]' : 'w-[67px]',
              'h-[22px] text-12 cursor-pointer flex items-center justify-center bg-blue-light bg-opacity-[0.2] text-center text-blue-light rounded-[2px]'
            )}
            onClick={handleSelectAll}
          >
            {/* Select All, Unselect All */}
            {!isSelectedAll
              ? t('page.approvals.RevokeApprovalModal.selectAll')
              : t('page.approvals.RevokeApprovalModal.unSelectAll')}
          </div>
        </section>

        <section
          className={clsx(
            'max-h-[100%] overflow-x-hidden pb-[12px] flex-shrink-1 approval-list'
          )}
          style={{
            overflowY: 'overlay',
          }}
        >
          {displayList}
        </section>
      </div>
      <div
        className={clsx(
          'absolute flex flex-col items-center justify-center bg-r-neutral-card1 left-0 bottom-0 w-full z-[99999] border-t border-rabby-neutral-line',
          'px-[16px]'
        )}
        style={{ height: BOTTOM_BUTTON_AREA }}
      >
        <Button
          className="min-w-[172px] w-full h-[44px]"
          type="primary"
          size="large"
          onClick={handleConfirm}
        >
          {t('page.approvals.RevokeApprovalModal.confirm', {
            selectedCount:
              selectedIdxes.length > 0 ? `(${selectedIdxes.length})` : '',
          })}
        </Button>
      </div>
    </ModalStyled>
  );
};
