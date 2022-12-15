import React, { useEffect, useState } from 'react';
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
  const [confirmBtnText, setConfirmBtnText] = useState('');
  const [inited, setInited] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [rpcUrl, setRpcUrl] = useState('');
  const [rpcErrorMsg, setRpcErrorMsg] = useState('');

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
    setConfirmBtnText(t('Change'));
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

  if (!inited) return <></>;

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
        {rpcErrorMsg && <ErrorMsg>{rpcErrorMsg}</ErrorMsg>}
      </div>
      <footer className="connect-footer">
        <div
          className={clsx([
            'action-buttons flex mt-4',
            showChain ? 'justify-between' : 'justify-center',
          ])}
        >
          {showChain ? (
            <>
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
              >
                {confirmBtnText}
              </Button>
            </>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-[200px]"
              onClick={() => rejectApproval()}
            >
              {t('OK')}
            </Button>
          )}
        </div>
      </footer>
    </>
  );
};

export default AddChain;
