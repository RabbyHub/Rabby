import React from 'react';
import { DisplayChainWithWhiteLogo } from '@/ui/hooks/useCurrentBalance';
import { Chain } from '@debank/common';

export const ChainList: React.FC<{
  isGnosis: boolean;
  gnosisNetworks: Chain[];
  chainBalances: DisplayChainWithWhiteLogo[];
}> = ({ isGnosis, gnosisNetworks, chainBalances }) => {
  const MAX_CHAINS = 10;

  if (isGnosis) {
    if (gnosisNetworks.length === 1) {
      const gnosisNetwork = gnosisNetworks[0];
      return (
        <img
          src={gnosisNetwork.whiteLogo || gnosisNetwork.logo}
          className="icon icon-chain"
        />
      );
    } else {
      return (
        <>
          {gnosisNetworks.map((gnosisNetwork) => {
            return (
              <img
                key={gnosisNetwork.id}
                src={gnosisNetwork.whiteLogo || gnosisNetwork.logo}
                className="icon icon-chain"
              />
            );
          })}
        </>
      );
    }
  }
  const result = chainBalances
    .sort((a, b) => b.usd_value - a.usd_value)
    .map((item) => (
      <img
        src={item.whiteLogo || item.logo_url}
        className="icon-chain"
        key={item.id}
        alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
        title={`${item.name}: $${item.usd_value.toFixed(2)}`}
      />
    ));
  if (result.length >= MAX_CHAINS) {
    return (
      <>
        {result.slice(0, MAX_CHAINS - 1).concat(
          <div
            key="more"
            className="icon-chain leading-[12px] font-normal flex items-center"
          >
            +{result.length - MAX_CHAINS + 1}
          </div>
        )}
      </>
    );
  }
  return <>{result}</>;
};
