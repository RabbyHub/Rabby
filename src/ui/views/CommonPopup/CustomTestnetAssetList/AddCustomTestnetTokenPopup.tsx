import { Popup } from '@/ui/component';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { formatAmount, useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { useRequest, useSetState } from 'ahooks';
import { Button, Form, Input } from 'antd';
import React, { useState } from 'react';
import styled from 'styled-components';
import IconUnknown from '@/ui/assets/token-default.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useTranslation } from 'react-i18next';

interface Props {
  visible?: boolean;
  onClose?(): void;
}

const Wraper = styled.div`
  .ant-form-item {
    margin-bottom: 16px;
  }
  .ant-form-item-label > label {
    color: var(--r-neutral-body, #3e495e);
    font-size: 13px;
    line-height: 16px;
  }

  .ant-input {
    height: 52px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    background: transparent;
    border: 0.5px solid var(--r-neutral-line, #d3d8e0);
    border-radius: 6px;

    color: var(--r-neutral-title1, #192945);
    font-size: 15px;
    font-weight: 500;
  }
  .ant-input[disabled] {
    background: var(--r-neutral-card2, #f2f4f7);
    border-color: transparent;
    &:hover {
      border-color: transparent;
    }
  }
  .ant-form-item-has-error .ant-input,
  .ant-form-item-has-error .ant-input:hover {
    border: 1px solid var(--r-red-default, #e34935);
  }

  .ant-form-item-explain.ant-form-item-explain-error {
    color: var(--r-red-default, #e34935);
    font-size: 13px;
    line-height: 16px;
    min-height: 16px;
  }
`;

const Footer = styled.div`
  height: 76px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-card-1, rgba(255, 255, 255, 0.06));
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
`;

export const AddCustomTestnetTokenPopup = ({ visible, onClose }: Props) => {
  const wallet = useWallet();
  const [chainSelectorState, setChainSelectorState] = useSetState({
    visible: false,
    chain: null as CHAINS_ENUM | null,
  });

  const chain = findChain({ enum: chainSelectorState.chain });
  const [tokenId, setTokenId] = useState('');
  const { t } = useTranslation();

  const { data: token, runAsync: runGetToken } = useRequest(
    async () => {
      const currentAccount = await wallet.getCurrentAccount();
      if (!chain?.id || !tokenId) {
        return null;
      }
      return wallet.getCustomTestnetToken({
        address: currentAccount!.address,
        chainId: chain.id,
        tokenId,
      });
    },
    {
      refreshDeps: [chain?.id, tokenId],
    }
  );

  const handleConfirm = () => {
    // todo
    return;
  };

  return (
    <>
      <Popup
        visible={visible}
        closable={false}
        height={494}
        onClose={onClose}
        className="add-custom-token-popup"
        push={false}
        title="Add Testnet Token"
      >
        <Wraper>
          <Form layout="vertical">
            <Form.Item label="Chain">
              <div
                onClick={() => {
                  setChainSelectorState({
                    visible: true,
                  });
                }}
              >
                {!chain ? (
                  <div className="flex items-center bg-r-neutral-card2 rounded-[6px] px-[16px] py-[12px] min-h-[52px]">
                    <div className="text-r-neutral-title1 text-[15px] leading-[18px]">
                      Select chain
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center bg-r-neutral-card2 rounded-[6px] gap-[8px] px-[16px] py-[12px] min-h-[52px]">
                    <img
                      src={chain?.logo}
                      alt=""
                      className="w-[28px] h-[28px] rounded-full"
                    />
                    <div className="text-r-neutral-title1 text-[15px] leading-[18px]">
                      {chain?.name}
                    </div>
                  </div>
                )}
              </div>
            </Form.Item>
            <Form.Item label="Token Address">
              <Input
                onChange={(e) => {
                  setTokenId(e.target.value);
                }}
              />
            </Form.Item>
            {token ? (
              <Form.Item label="Found Token">
                <div className="flex items-center gap-[12px] rounded-[6px] bg-r-neutral-card2 min-h-[52px] px-[16px] py-[14px]">
                  <div className="relative h-[24px]">
                    <img
                      src={IconUnknown}
                      alt=""
                      className="w-[24px] h-[24px] rounded-full"
                    />
                    <TooltipWithMagnetArrow
                      title={chain?.name}
                      className="rectangle w-[max-content]"
                    >
                      <img
                        className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                        src={chain?.logo || IconUnknown}
                        alt={chain?.name}
                      />
                    </TooltipWithMagnetArrow>
                  </div>
                  <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
                    {formatAmount(token.amount)} {token.symbol}
                  </div>
                </div>
              </Form.Item>
            ) : null}
          </Form>
          <Footer>
            <Button
              type="primary"
              size="large"
              className="rabby-btn-ghost w-[172px]"
              ghost
              onClick={onClose}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              disabled={!token}
              onClick={handleConfirm}
            >
              {t('global.Confirm')}
            </Button>
          </Footer>
        </Wraper>
      </Popup>
      <ChainSelectorModal
        hideTestnetTab={false}
        visible={chainSelectorState.visible}
        onCancel={() => {
          setChainSelectorState({
            visible: false,
          });
        }}
        onChange={(value) => {
          setChainSelectorState({
            visible: false,
            chain: value,
          });
        }}
      />
    </>
  );
};
