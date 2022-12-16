import React, { useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { intToHex } from 'ethereumjs-util';
import BigNumber from 'bignumber.js';
import styled from 'styled-components';
import { useDebounce } from 'react-use';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { Chain } from 'background/service/openapi';
import { useWallet, useApproval } from 'ui/utils';
import { isValidateUrl } from 'ui/utils/url';
import { FieldCheckbox } from 'ui/component';
import IconWarning from 'ui/assets/warning.svg';

export interface AddEthereumChainParams {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

interface AddChainProps {
  data: AddEthereumChainParams[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const UnknownLogo = styled.div`
  width: 56px;
  height: 56px;
  background: #e5e9ef;
  border-radius: 100%;
  font-weight: 500;
  font-size: 24px;
  line-height: 56px;
  text-align: center;
  color: #707280;
`;

const ErrorMsg = styled.div`
  color: #ec5151;
  font-weight: 400;
  font-size: 12px;
  line-height: 16px;
  margin-top: 8px;
`;

const OptionsWrapper = styled.div`
  height: 100%;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  .field {
    background-color: #f5f6fa !important;
    flex-flow: row-reverse;
    .right-icon {
      margin-right: 12px;
    }
    .field-slot {
      span {
        max-width: 100px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    &.checked {
      background-color: #f3f5ff !important;
      .rabby-checkbox {
        background-color: #8697ff !important;
      }
    }
  }
`;

const Footer = styled.div`
  height: 76px;
  border-top: 1px solid #e5e9ef;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
`;

const AddChain = ({ params }: { params: AddChainProps }) => {
  const wallet = useWallet();
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();

  const { data, session } = params;
  // eslint-disable-next-line prefer-const
  let [{ chainId, chainName, rpcUrls }] = data;
  if (typeof chainId === 'number') {
    chainId = intToHex(chainId).toLowerCase();
  } else {
    chainId = chainId.toLowerCase();
  }

  const [showChain, setShowChain] = useState<Chain | undefined>(undefined);
  const [defaultChain, setDefaultChain] = useState<CHAINS_ENUM | null>(null);
  const [inited, setInited] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [rpcUrl, setRpcUrl] = useState('');
  const [rpcErrorMsg, setRpcErrorMsg] = useState('');
  const [showOptions, setShowOptions] = useState(true);
  const [selectedOption, setSelectedOption] = useState(0);
  const [showUnsupportAlert, setShowUnsupportAlert] = useState(false);
  const canSave = useMemo(() => {
    return rpcUrl && !rpcErrorMsg && isSupported;
  }, [rpcErrorMsg, isSupported, rpcUrl]);

  const init = async () => {
    const site = await wallet.getConnectedSite(session.origin)!;
    setDefaultChain(site?.chain || null);
    if (rpcUrls.length > 0) {
      setRpcUrl(rpcUrls[0]);
    }
    setInited(true);
  };

  const handleRPCChanged = (rpc: string) => {
    setRpcUrl(rpc);
    if (!isValidateUrl(rpc)) {
      setRpcErrorMsg('Invalid rpc url');
    }
  };

  const rpcValidation = async () => {
    if (!isValidateUrl(rpcUrl)) {
      setRpcErrorMsg('Invalid rpc url');
      return;
    }
    try {
      const isValid = await wallet.validateRPC(rpcUrl, Number(chainId));
      if (!isValid) {
        setRpcErrorMsg('Invalid Chain ID');
      } else {
        setRpcErrorMsg('');
      }
    } catch (e) {
      setRpcErrorMsg('RPC authentication failed');
    }
  };

  useEffect(() => {
    const chain = Object.values(CHAINS).find((chain) =>
      new BigNumber(chain.hex).isEqualTo(chainId)
    );
    if (chain) {
      setShowChain(chain);
    } else {
      setIsSupported(false);
      setShowChain({
        id: Number(chainId),
        name: chainName || 'Unknown',
        hex: `0x${Number(chainId).toString(16)}`,
        logo: '',
        enum: CHAINS_ENUM.ETH,
        serverId: '',
        network: '',
        nativeTokenSymbol: '',
        nativeTokenLogo: '',
        nativeTokenAddress: '',
        scanLink: '',
        thridPartyRPC: '',
        nativeTokenDecimals: 18,
        selectChainLogo: '',
        eip: {},
      });
    }
  }, [defaultChain]);

  useDebounce(rpcValidation, 200, [rpcUrl]);

  useEffect(() => {
    init();
  }, []);

  const handleConfirm = () => {
    resolveApproval({
      chain: showChain?.enum,
      rpcUrl,
    });
  };

  const handleSelectOption = (id: number) => {
    setSelectedOption(id);
  };

  const handleClickContinue = () => {
    if (selectedOption === 0) {
      if (isSupported) {
        resolveApproval();
      } else {
        setShowUnsupportAlert(true);
        setShowOptions(false);
      }
    } else {
      setShowOptions(false);
    }
  };

  if (!inited) return <></>;
  console.log('showUnsupportAlert', showUnsupportAlert);
  if (showUnsupportAlert) {
    return (
      <OptionsWrapper>
        <div className="flex-1 px-28 pt-60">
          <img src={IconWarning} className="w-[68px] h-[68px] mb-28 mx-auto" />
          <div className="text-gray-title text-20 w-[344px] mx-auto font-medium text-center">
            {t('The requested chain is not supported by Rabby yet')}
          </div>
        </div>
        <Footer className="justify-center">
          <Button
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={() => rejectApproval()}
          >
            OK
          </Button>
        </Footer>
      </OptionsWrapper>
    );
  }

  if (showOptions) {
    return (
      <OptionsWrapper>
        <div className="flex-1 px-20">
          <h1 className="mb-12">Dapp attempts to add custom RPC</h1>
          <p className="mb-28 text-gray-subTitle">
            Rabby can't verify the security of custom RPC. The custom RPC will
            replace Rabby's node. It can be deleted later in "Settings" -
            "Custom RPC"
          </p>
          <FieldCheckbox
            defaultChecked
            checked={selectedOption === 0}
            className={clsx({ checked: selectedOption === 0 })}
            onChange={(checked) => {
              if (checked) handleSelectOption(0);
            }}
          >
            Switch to
            <span className="text-gray-title font-bold mx-4">
              {showChain ? showChain.name : 'Unknown'}
            </span>
            without adding RPC
          </FieldCheckbox>
          <FieldCheckbox
            className={clsx({ checked: selectedOption === 1 })}
            checked={selectedOption === 1}
            onChange={(checked) => {
              if (checked) handleSelectOption(1);
            }}
          >
            Allow this site to add custom RPC
          </FieldCheckbox>
        </div>
        <Footer>
          <Button
            type="primary"
            size="large"
            ghost
            className="rabby-btn-ghost w-[172px]"
            onClick={() => rejectApproval()}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            className="w-[172px]"
            size="large"
            onClick={handleClickContinue}
          >
            Continue
          </Button>
        </Footer>
      </OptionsWrapper>
    );
  }

  return (
    <>
      <div className="approval-chain">
        <div className="text-center mb-12 text-18">Edit RPC</div>
        <div className="text-center">
          {showChain?.logo ? (
            <img
              className="w-[56px] h-[56px] mx-auto mb-12"
              src={showChain?.logo}
            />
          ) : (
            <UnknownLogo className="mx-auto mb-12">
              {showChain?.name[0].toUpperCase()}
            </UnknownLogo>
          )}
          <div className="mb-8 text-20 text-gray-title leading-none">
            {showChain?.name}
          </div>
          <div className="mb-8 text-14 text-gray-title text-left">RPC URL</div>
        </div>
        <Input
          className={clsx('rpc-input', { 'has-error': rpcErrorMsg })}
          value={rpcUrl}
          disabled={!isSupported}
          placeholder="Enter the RPC URL"
          onChange={(e) => handleRPCChanged(e.target.value)}
        />
        {isSupported ? (
          rpcErrorMsg && <ErrorMsg>{rpcErrorMsg}</ErrorMsg>
        ) : (
          <ErrorMsg>The requested chain is not supported by Rabby yet</ErrorMsg>
        )}
      </div>
      <footer className="connect-footer">
        <div
          className={clsx([
            'action-buttons flex mt-4',
            showChain ? 'justify-between' : 'justify-center',
          ])}
        >
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={() => rejectApproval()}
          >
            {t('Cancel')}
          </Button>
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleConfirm}
            disabled={!canSave}
          >
            Save
          </Button>
        </div>
      </footer>
    </>
  );
};

export default AddChain;
