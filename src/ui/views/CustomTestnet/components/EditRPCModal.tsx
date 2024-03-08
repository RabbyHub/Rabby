import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Input, Button, Form } from 'antd';
import styled from 'styled-components';
import { useDebounce } from 'react-use';
import { useWallet } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { Popup, PageHeader } from 'ui/component';
import { isValidateUrl } from 'ui/utils/url';
import { RPCItem } from '@/background/service/rpc';
import { findChainByEnum } from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import { CustomTestnetForm } from './CustomTestnetForm';
import { ReactComponent as RcIconFlash } from 'ui/assets/custom-testnet/icon-flash.svg';
import { ReactComponent as RcIconRight } from 'ui/assets/custom-testnet/icon-right.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

const ErrorMsg = styled.div`
  color: #ec5151;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  margin-top: 8px;
`;

const Wrapper = styled.div`
  padding-bottom: 76px;
  .rpc-input {
    height: 52px;
    width: 360px;
    margin-left: auto;
    margin-right: auto;
    background: #f5f6fa;
    border: 1px solid #e5e9ef;
    border-radius: 6px;
    &.has-error {
      border-color: #ec5151;
    }
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

export const EditCustomTestnetModal = ({
  chain,
  rpcInfo,
  visible,
  onCancel,
  onConfirm,
}: {
  chain: CHAINS_ENUM;
  rpcInfo: { id: CHAINS_ENUM; rpc: RPCItem } | null;
  visible: boolean;
  onCancel(): void;
  onConfirm(url: string): void;
}) => {
  const wallet = useWallet();
  const chainItem = useMemo(() => findChainByEnum(chain), [chain]);
  const [rpcUrl, setRpcUrl] = useState('');
  const [rpcErrorMsg, setRpcErrorMsg] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const canSubmit = useMemo(() => {
    return rpcUrl && !rpcErrorMsg && !isValidating;
  }, [rpcUrl, rpcErrorMsg, isValidating]);
  const { t } = useTranslation();

  const inputRef = useRef<Input>(null);

  const handleRPCChanged = (url: string) => {
    setRpcUrl(url);
    if (!isValidateUrl(url)) {
      setRpcErrorMsg(t('page.customRpc.EditRPCModal.invalidRPCUrl'));
    }
  };

  const rpcValidation = async () => {
    if (!chainItem) return;

    if (!isValidateUrl(rpcUrl)) {
      return;
    }
    try {
      setIsValidating(true);
      const isValid = await wallet.validateRPC(rpcUrl, chainItem.id);
      setIsValidating(false);
      if (!isValid) {
        setRpcErrorMsg(t('page.customRpc.EditRPCModal.invalidChainId'));
      } else {
        setRpcErrorMsg('');
      }
    } catch (e) {
      setIsValidating(false);
      setRpcErrorMsg(t('page.customRpc.EditRPCModal.rpcAuthFailed'));
    }
  };

  useDebounce(rpcValidation, 200, [rpcUrl]);

  useEffect(() => {
    if (rpcInfo) {
      setRpcUrl(rpcInfo.rpc.url);
    } else {
      setRpcUrl('');
    }
  }, [rpcInfo]);

  useEffect(() => {
    if (!visible) {
      setRpcUrl('');
      setRpcErrorMsg('');
    }
    setTimeout(() => {
      inputRef.current?.input?.focus();
    });
  }, [visible]);

  return (
    <Popup
      height={520}
      visible={visible}
      onCancel={onCancel}
      bodyStyle={{
        paddingBottom: 0,
      }}
      style={{
        zIndex: 1001,
      }}
      // isSupportDarkMode
    >
      <Wrapper>
        <PageHeader className="pt-0" forceShowBack={false} canBack={false}>
          {t('page.customRpc.EditCustomTestnetModal.title')}
        </PageHeader>
        <div
          className={clsx(
            'flex items-center gap-[8px]',
            'bg-r-blue-light1 p-[16px] cursor-pointer rounded-[6px]',
            'mb-[20px]'
          )}
        >
          <ThemeIcon src={RcIconFlash}></ThemeIcon>
          <div className="text-r-neutral-title1 text-[15px] leading-[18px] font-medium">
            Quick add from Chainlist
          </div>
          <ThemeIcon src={RcIconRight} className="ml-auto"></ThemeIcon>
        </div>
        <CustomTestnetForm />
        <Footer>
          <Button
            type="primary"
            size="large"
            className="rabby-btn-ghost w-[172px]"
            ghost
            onClick={onCancel}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            type="primary"
            loading={isValidating}
            size="large"
            className="w-[172px]"
            onClick={() => onConfirm(rpcUrl)}
          >
            {isValidating ? t('global.Loading') : t('global.Confirm')}
          </Button>
        </Footer>
      </Wrapper>
    </Popup>
  );
};
