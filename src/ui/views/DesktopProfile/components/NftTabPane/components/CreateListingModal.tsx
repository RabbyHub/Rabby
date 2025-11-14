import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { Button, Input, Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  table {
    td {
      padding: 12px 6px;

      &:first-child {
        padding-left: 0;
      }

      &:last-child {
        padding-left: 0;
      }
    }
  }
`;

export const CreateListingModal: React.FC<ModalProps> = (props) => {
  return (
    <Modal
      {...props}
      width={880}
      centered
      footer={null}
      bodyStyle={{
        maxHeight: 'unset',
        padding: 0,
      }}
      maskStyle={{
        background: 'rgba(0, 0, 0, 0.30)',
        backdropFilter: 'blur(8px)',
      }}
      className="modal-support-darkmode"
    >
      <Container>
        <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
          Create listing
        </h1>
        <div className="px-[20px] pb-[24px]">
          <div className="py-[12px] border-b-[0.5px] border-solid border-rabby-neutral-line ">
            <table className="w-full">
              <colgroup>
                <col width={260} />
                <col width={100} />
                <col width={100} />
                <col width={100} />
                <col width={100} />
                <col width={180} />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot">
                    NFT
                  </th>
                  <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                    Floor
                  </th>
                  <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                    Top Offer
                  </th>
                  <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                    Cost
                  </th>
                  <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                    Proceeds
                  </th>
                  <th className="text-[13px] leading-[16px] font-medium text-r-neutral-foot text-right">
                    Listed as
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="flex items-center gap-[10px]">
                      <NFTAvatar className="w-[36px] h-[36px]" chain="eth" />
                      <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
                        <div
                          className={clsx(
                            'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate'
                          )}
                        >
                          Rabby Desktop Genesis 37345
                        </div>
                        <div
                          className={clsx(
                            'text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate'
                          )}
                        >
                          Rabby Desktop Genesis
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div
                      className={clsx(
                        'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                      )}
                    >
                      0.0003 ETH
                    </div>
                    <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate text-right">
                      $1.34
                    </div>
                  </td>
                  <td>
                    <div
                      className={clsx(
                        'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                      )}
                    >
                      0.0003 ETH
                    </div>
                    <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate text-right">
                      $1.34
                    </div>
                  </td>
                  <td>
                    <div
                      className={clsx(
                        'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                      )}
                    >
                      -
                    </div>
                  </td>
                  <td>
                    <div
                      className={clsx(
                        'text-[13px] leading-[16px] font-medium text-r-neutral-title1 truncate mb-[4px] text-right'
                      )}
                    >
                      0.0003 ETH
                    </div>
                    <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot truncate text-right">
                      $1.34
                    </div>
                  </td>
                  <td>
                    <Input placeholder="Price in ETH" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </Modal>
  );
};
