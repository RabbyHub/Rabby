import IconArrowDown from '@/ui/assets/approval/icon-arrow-down.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useRabbySelector } from '@/ui/store';
import { Chain } from '@debank/common';
import { useSetState } from 'ahooks';
import { Button } from 'antd';
import BigNumber from 'bignumber.js';
import { CHAINS } from 'consts';
import { intToHex } from 'ethereumjs-util';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FallbackSiteLogo } from 'ui/component';
import { useApproval, useWallet } from 'ui/utils';
import { OptionsWrapper, Footer } from './style';
import { UnsupportedAlert } from './UnsupportedAlert';
import { AddEthereumChainParams } from './type';
import { findChain } from '@/utils/chain';

interface AddChainProps {
  data: AddEthereumChainParams[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const SwitchChain = ({ params }: { params: AddChainProps }) => {
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
    currentChain: null as Chain | null | undefined,
    nextChain: null as Chain | null | undefined,
    isSwitchToMainnet: false,
    isSwitchToTestnet: false,
    isShowUnsupportAlert: false,
  });

  const init = async () => {
    const site = await wallet.getConnectedSite(session.origin)!;

    const currentChain = site ? findChain({ enum: site.chain }) : null;
    const nextChain =
      findChain({
        hex: chainId,
      }) || null;

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

  useEffect(() => {
    if (state.isShowUnsupportAlert) {
      wallet.updateNotificationWinProps({
        height: 388,
      });
    }
  }, [state.isShowUnsupportAlert]);

  const handleConfirm = () => {
    resolveApproval();
  };

  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );

  const isShowTestnetTip = useMemo(() => {
    if (!isShowTestnet && state.nextChain?.isTestnet) {
      return true;
    }
    return false;
  }, [isShowTestnet, state.nextChain?.isTestnet]);

  if (!inited) return <></>;

  if (state.isShowUnsupportAlert) {
    return <UnsupportedAlert data={data[0]} />;
  }

  if (state.isSwitchToMainnet || state.isSwitchToTestnet) {
    return (
      <OptionsWrapper>
        <div className="content">
          <div className="title">
            {t('page.switchChain.title', {
              chain: state.isSwitchToMainnet ? 'Mainnet' : 'Testnet',
            })}
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
            {t('global.cancelButton')}
          </Button>
          {isShowTestnetTip ? (
            <TooltipWithMagnetArrow
              overlayClassName="rectangle"
              overlayStyle={{ maxWidth: '305px', width: '305px' }}
              title={t('page.switchChain.testnetTip')}
              placement="topRight"
            >
              <span>
                <Button
                  type="primary"
                  className="w-[172px]"
                  size="large"
                  onClick={handleConfirm}
                  disabled
                >
                  {t('global.Confirm')}
                </Button>
              </span>
            </TooltipWithMagnetArrow>
          ) : (
            <Button
              type="primary"
              className="w-[172px]"
              size="large"
              onClick={handleConfirm}
            >
              {t('global.Confirm')}
            </Button>
          )}
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

export default SwitchChain;
