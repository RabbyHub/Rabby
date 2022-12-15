import { CHAINS_ENUM, CHAINS } from '@debank/common';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useWallet } from '@/ui/utils';

const ChainIconWrapper = styled.div`
  position: relative;
`;

const ChainIconEle = styled.img`
  border-radius: 100%;
  width: 32px;
  height: 32px;
  overflow: hidden;
`;

const AvaliableIcon = styled.div`
  position: absolute;
  right: -2px;
  top: -2px;
  width: 10px;
  height: 10px;
  border: 1px solid #ffffff;
  background: #27c193;
  border-radius: 100%;
  overflow: hidden;
`;

const UnavaliableIcon = styled.div`
  position: absolute;
  right: -2px;
  top: -2px;
  width: 10px;
  height: 10px;
  border: 1px solid #ffffff;
  background: #ec5151;
  border-radius: 100%;
  overflow: hidden;
`;

interface Props {
  chain: CHAINS_ENUM;
  customRPC: string | undefined;
}

const ChainIcon = ({ chain, customRPC }: Props) => {
  const wallet = useWallet();
  const [customRPCAvaliable, setCustomRPCAvaliable] = useState(true);

  const pingCustomRPC = async () => {
    if (customRPC) {
      try {
        await wallet.pingCustomRPC(customRPC);
        setCustomRPCAvaliable(true);
      } catch (e) {
        setCustomRPCAvaliable(false);
      }
    }
  };

  useEffect(() => {
    pingCustomRPC();
  }, [chain, customRPC]);

  return (
    <ChainIconWrapper>
      <ChainIconEle src={CHAINS[chain].logo} />
      {customRPC &&
        (customRPCAvaliable ? <AvaliableIcon /> : <UnavaliableIcon />)}
    </ChainIconWrapper>
  );
};

export default ChainIcon;
