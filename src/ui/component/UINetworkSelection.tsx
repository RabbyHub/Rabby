import { Select } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';

import type { Chain } from '@debank/common';
import type { E_NetworkType } from '@/types/enum';

// Define the NetworkList interface
interface I_NetworkList {
  network: string;
  value: string;
  name: string;
  symbol: string;
}

export const UINetworkSelection = ({
  currentNetwork,
  networkType,
  list,
  onNetworkChange,
}: {
  currentNetwork?: Chain | null;
  networkType: E_NetworkType | string;
  list: I_NetworkList[];
  onNetworkChange?: (chainId: string) => void;
}) => {
  const [networks, setNetworks] = useState<I_NetworkList[]>([]);
  const networkList = list.filter((it) => it.network === networkType);
  const _defaultValue = useRef(networkList[0]?.value);

  useEffect(() => {
    _defaultValue.current = networkList[0]?.value;

    // Load networks based on networkType
    setNetworks(networkList);

    // If we have a default value and onNetworkChange is provided, call it
    if (_defaultValue.current && onNetworkChange) {
      onNetworkChange(_defaultValue.current);
    }
  }, [networkType, onNetworkChange]);

  const handleSwitchNetwork = (chainId: string) => {
    if (onNetworkChange) {
      onNetworkChange(chainId);
    }
  };

  return (
    <Select.Root
      size={'2'}
      onValueChange={handleSwitchNetwork}
      value={currentNetwork?.id?.toString() || networks[0]?.value}
    >
      <Select.Trigger variant={'soft'} placeholder="Select a network" />
      <Select.Content
        variant="solid"
        color="gray"
        highContrast
        position="popper"
      >
        <Select.Group>
          <Select.Label>{networkType.toUpperCase()}</Select.Label>
          {networks.map((network) => (
            <Select.Item key={network.value} value={network.value}>
              {network.name}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
};
