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
import { ApprovalCardContract } from './ApprovalCardContract';
import { MemoInModalApprovalContractRow } from './InModalApprovalContractRow';
import clsx from 'clsx';

export const ApprovalContractPopup: React.FC = () => {
  const { t } = useTranslation();
  const {
    focusedContract,
    contractDraftMap,
    openAddressOnScan,
    setContractDraftMap,
    commitContractDraft,
    setFocusedContract,
  } = useApprovalsPage();

  const items = React.useMemo(() => {
    if (!focusedContract) {
      return [];
    }

    return focusedContract.list.map((member) => {
      const key = encodeApprovalSpenderKey(focusedContract, member, true);
      return {
        key,
        checked: Boolean(contractDraftMap[key]),
        member,
        onJump:
          'spender' in member
            ? () => openAddressOnScan(member.chain, member.spender.id)
            : undefined,
      };
    });
  }, [contractDraftMap, focusedContract, openAddressOnScan]);

  const allSelected =
    items.length > 0 && items.every((item) => contractDraftMap[item.key]);
  return (
    <Popup
      visible={Boolean(focusedContract)}
      onCancel={() => {
        setFocusedContract(null);
        setContractDraftMap({});
      }}
      closable={false}
      height={540}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
    >
      <div className="bg-r-neutral-bg-2 rounded-t-[16px] h-full pt-[20px] px-[20px]">
        {focusedContract ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 overflow-auto">
              <ApprovalCardContract contract={focusedContract} />

              <div className="mt-[20px] flex items-center justify-between gap-[12px] px-[2px]">
                <div className="text-[13px] leading-[16px] text-r-neutral-foot">
                  Approved Assets Amount & Balance
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setContractDraftMap((previous) => {
                      return buildSelectionMapForApproval(
                        focusedContract,
                        'contract',
                        Object.keys(previous).length !==
                          focusedContract.list.length
                      );
                    });
                  }}
                  className="h-auto px-0 py-0 text-[13px] leading-[16px] font-medium text-r-blue-default"
                >
                  {allSelected ? 'Select All' : 'Unselect All'}
                </button>
              </div>

              <div className="mt-[8px]">
                <div className="flex flex-col gap-[8px] pb-[8px]">
                  {items.map((item) => (
                    <MemoInModalApprovalContractRow
                      key={item.key}
                      approval={focusedContract}
                      contractApproval={item.member}
                      isSelected={item.checked}
                      onToggleSelection={() => {
                        setContractDraftMap((previous) => {
                          const next = { ...previous };
                          if (next[item.key]) {
                            delete next[item.key];
                          } else {
                            const revokeItem = toRevokeItem(
                              focusedContract,
                              item.member,
                              true
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
            <footer
              className={clsx(
                'py-[14px] px-[20px] mx-[-20px]',
                'border-t border-rabby-neutral-line'
              )}
            >
              <Button
                type="primary"
                block
                className="h-[48px] shrink-0"
                onClick={commitContractDraft}
                disabled={Object.keys(contractDraftMap).length === 0}
              >
                {/* {t('page.approvals.component.RevokeButton.btnText', {
                  count: Object.keys(contractDraftMap).length,
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
