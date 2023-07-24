import IconArrowDown from '@/ui/assets/approval/icon-arrow-down.svg';
import { CHAINS_LIST } from '@debank/common';
import { useSetState } from 'ahooks';
import { Button } from 'antd';
import { Chain } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import { CHAINS } from 'consts';
import { intToHex } from 'ethereumjs-util';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconWarning from 'ui/assets/warning.svg';
import { FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';

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

const OptionsWrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;

  .content {
    padding: 20px;
  }

  .title {
    color: #13141a;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    margin-bottom: 40px;
  }
  .connect-site-card {
    border-radius: 8px;
    background: #f5f6fa;
    display: inline-flex;
    padding: 28px 28px 32px 28px;
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 40px;

    .site-origin {
      color: #13141a;
      text-align: center;
      font-size: 22px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
    }
  }
  .switch-chain {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .chain-card {
    display: flex;
    width: 260px;
    padding: 12px;
    justify-content: center;
    align-items: center;
    gap: 8px;
    border-radius: 6px;
    border: 1px solid #e5e9ef;

    color: #13141a;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;

    img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }
`;

const Footer = styled.div`
  margin-top: auto;
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

  const chainId = useMemo(() => {
    const chainId = data?.[0]?.chainId;
    if (typeof chainId === 'number') {
      return intToHex(chainId).toLowerCase();
    } else {
      return chainId.toLowerCase();
    }
  }, [data]);

  const [inited, setInited] = useState(false);
  const [state, setState] = useSetState({
    currentChain: null as Chain | null,
    nextChain: null as Chain | null,
    isSwitchToMainnet: false,
    isSwitchToTestnet: false,
    isShowUnsupportAlert: false,
  });

  const init = async () => {
    const site = await wallet.getConnectedSite(session.origin)!;

    const currentChain = site ? CHAINS[site.chain] : null;
    const nextChain =
      CHAINS_LIST.find((item) => new BigNumber(item.hex).isEqualTo(chainId)) ||
      null;

    const isSwitchToMainnet =
      currentChain &&
      nextChain &&
      currentChain.isTestnet &&
      !nextChain.isTestnet;
    const isSwitchToTestnet =
      currentChain &&
      nextChain &&
      !currentChain.isTestnet &&
      nextChain.isTestnet;

    setState({
      isShowUnsupportAlert: !nextChain,
      isSwitchToMainnet: !!isSwitchToMainnet,
      isSwitchToTestnet: !!isSwitchToTestnet,
      currentChain,
      nextChain,
    });

    setInited(true);
  };

  useEffect(() => {
    init();
  }, []);

  const handleConfirm = () => {
    resolveApproval();
  };

  if (!inited) return <></>;

  if (state.isShowUnsupportAlert) {
    return (
      <OptionsWrapper>
        <div className="flex-1 px-28 pt-80">
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

  if (state.isSwitchToMainnet || state.isSwitchToTestnet) {
    return (
      <OptionsWrapper>
        <div className="content">
          <div className="title">
            Switching to {state.isSwitchToMainnet ? 'Mainnet' : 'Testnet'}
          </div>
          <div className="connect-site-card">
            <FallbackSiteLogo
              url={session.icon}
              origin={session.origin}
              width="40px"
            />
            <p className="site-origin">{session.origin}</p>
          </div>
          <div className="switch-chain">
            <ChainCard chain={state.currentChain}></ChainCard>
            <img src={IconArrowDown} alt="" />
            <ChainCard chain={state.nextChain}></ChainCard>
          </div>
        </div>
        <Footer className="border-0">
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
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        </Footer>
      </OptionsWrapper>
    );
  }

  return null;
};

const ChainCard = ({ chain }: { chain?: Chain | null }) => {
  if (!chain) {
    return null;
  }
  return (
    <div className="chain-card">
      <img src={chain.logo} alt="" />
      {chain.name}
    </div>
  );
};

export default AddChain;
