import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import { Popup } from 'ui/component';
import {
  buildSelectionMapForApproval,
  encodeApprovalSpenderKey,
  toRevokeItem,
  useApprovalsPage,
} from '../../hooks/useManageApprovalsPage';
import { ApprovalCardAsset } from './ApprovalCardAsset';
import { MemoInModalApprovalAssetRow } from './InModalApprovalAssetRow';
import clsx from 'clsx';

export const ApprovalAssetPopup: React.FC = () => {
  const { t } = useTranslation();
  const {
    focusedAsset,
    assetDraftMap,
    setAssetDraftMap,
    openAddressOnScan,
    setFocusedAsset,
    commitAssetDraft,
  } = useApprovalsPage();

  const items = React.useMemo(() => {
    if (!focusedAsset) {
      return [];
    }

    return focusedAsset.list.map((spender) => {
      const key = encodeApprovalSpenderKey(
        spender.$assetContract!,
        spender.$assetToken!,
        spender
      );

      return {
        key,
        checked: Boolean(assetDraftMap[key]),
        spender,
        onJump: () => openAddressOnScan(focusedAsset.chain, spender.id),
      };
    });
  }, [assetDraftMap, focusedAsset, openAddressOnScan]);

  const allSelected =
    items.length > 0 && items.every((item) => assetDraftMap[item.key]);

  return (
    <Popup
      visible={Boolean(focusedAsset)}
      onCancel={() => {
        setFocusedAsset(null);
        setAssetDraftMap({});
      }}
      closable={false}
      height={540}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
    >
      <div className="bg-r-neutral-bg-2 rounded-t-[16px] h-full pt-[20px] px-[20px]">
        {focusedAsset ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <ApprovalCardAsset assetItem={focusedAsset} />

              <div className="mt-[20px] flex items-center justify-between gap-[12px] px-[2px]">
                <div className="text-[13px] leading-[16px] text-r-neutral-foot">
                  Approved Contracts & Amount
                </div>
                <div
                  onClick={() => {
                    setAssetDraftMap((previous) => {
                      return buildSelectionMapForApproval(
                        focusedAsset,
                        'assets',
                        Object.keys(previous).length !==
                          focusedAsset.list.length
                      );
                    });
                  }}
                  className={clsx(
                    'cursor-pointer text-[13px] leading-[16px] font-medium text-r-blue-default'
                  )}
                >
                  {allSelected ? 'Unselect All' : 'Select All'}
                </div>
              </div>

              <div className="mt-[8px]">
                <div className="flex flex-col gap-[8px] pb-[8px]">
                  {items.map((item) => (
                    <MemoInModalApprovalAssetRow
                      key={item.key}
                      approval={focusedAsset}
                      spender={item.spender}
                      isSelected={item.checked}
                      onOpenLink={item.onJump}
                      onToggleSelection={() => {
                        setAssetDraftMap((previous) => {
                          const next = { ...previous };
                          if (next[item.key]) {
                            delete next[item.key];
                          } else {
                            const revokeItem = toRevokeItem(
                              item.spender.$assetContract!,
                              item.spender.$assetToken!,
                              item.spender
                            );
                            if (revokeItem) {
                              next[item.key] = revokeItem;
                            }
                          }
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <footer className="py-[14px] px-[20px] mx-[-20px] border-t border-rabby-neutral-line">
              <Button
                type="primary"
                block
                className="h-[48px] shrink-0"
                onClick={commitAssetDraft}
                disabled={Object.keys(assetDraftMap).length === 0}
              >
                {/* {t('page.approvals.component.RevokeButton.btnText', {
                  count: Object.keys(assetDraftMap).length,
                })} */}
                Confirm
              </Button>
            </footer>
          </div>
        ) : null}
      </div>
    </Popup>
  );
};
