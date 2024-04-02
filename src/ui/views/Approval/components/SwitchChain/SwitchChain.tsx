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
    isShowUnsupportAlert: false,
  });

  const init = async () => {
    const site = await wallet.getConnectedSite(session.origin)!;

    const currentChain = site ? findChain({ enum: site.chain }) : null;
    const nextChain =
      findChain({
        hex: chainId,
      }) || null;

    setState({
      isShowUnsupportAlert: !nextChain,
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

  if (!inited) return <></>;

  if (state.isShowUnsupportAlert) {
    return <UnsupportedAlert data={data[0]} session={session} />;
  }

  return <></>;
};

export default SwitchChain;
