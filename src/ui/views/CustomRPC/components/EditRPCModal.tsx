import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Input, Button } from 'antd';
import styled from 'styled-components';
import { useDebounce } from 'react-use';
import { useWallet } from 'ui/utils';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { Popup, PageHeader } from 'ui/component';
import { isValidateUrl } from 'ui/utils/url';
import { RPCItem } from '@/background/service/rpc';
import { findChainByEnum } from '@/utils/chain';
import { useTranslation } from 'react-i18next';

const ErrorMsg = styled.div`
  color: #ec5151;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  margin-top: 8px;
`;

const Footer = styled.div`
  height: 84px;
  border-top: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--r-neutral-card-1, rgba(255, 255, 255, 0.06));
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  width: 100vw;
  position: absolute;
  left: -20px;
  bottom: 0;
`;

const EditRPCWrapped = styled.div`
  position: relative;
  height: 100%;
  .rpc-input.rpc-input {
    height: 52px;

    height: 52px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    background: transparent !important;
    border: 1px solid var(--r-neutral-line, #d3d8e0) !important;
    border-radius: 6px;

    color: var(--r-neutral-title1, #192945) !important;
    font-size: 15px;
    /* font-weight: 500; */
    &:focus {
      border-color: var(--r-blue-default, #7084ff) !important;
    }
    &.has-error {
      border-color: #ec5151 !important;
    }
  }
`;

const EditRPCModal = ({
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
      height={440}
      visible={visible}
      onCancel={onCancel}
      bodyStyle={{
        paddingBottom: 0,
      }}
      style={{
        zIndex: 1001,
      }}
      isSupportDarkMode
    >
      <EditRPCWrapped>
        <PageHeader forceShowBack onBack={onCancel} className="pt-0">
          {t('page.customRpc.EditRPCModal.title')}
        </PageHeader>
        <div className="text-center">
          <img
            className="w-[56px] h-[56px] mx-auto mb-12"
            src={chainItem?.logo || ''}
          />
          <div className="mb-8 text-20 text-r-neutral-title-1 leading-none">
            {chainItem?.name}
          </div>
          <div className="mb-8 text-14 text-r-neutral-title-1 text-left">
            {t('page.customRpc.EditRPCModal.rpcUrl')}
          </div>
        </div>
        <Input
          ref={inputRef}
          className={clsx('rpc-input', { 'has-error': rpcErrorMsg })}
          value={rpcUrl}
          placeholder={t('page.customRpc.EditRPCModal.rpcUrlPlaceholder')}
          onChange={(e) => handleRPCChanged(e.target.value)}
        />
        {rpcErrorMsg && <ErrorMsg>{rpcErrorMsg}</ErrorMsg>}
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
            disabled={!canSubmit}
            onClick={() => onConfirm(rpcUrl)}
          >
            {isValidating ? t('global.Loading') : t('global.Save')}
          </Button>
        </Footer>
      </EditRPCWrapped>
    </Popup>
  );
};

export default EditRPCModal;
