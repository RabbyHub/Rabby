import React from 'react';
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom';

import { EcologyNavBar } from '@/ui/component/Ecology/EcologyNavBar';

import { DbkChainBridge } from './pages/Bridge';
import { DbkChainHome } from './pages/Home';
import { DbkChainMintNFT } from './pages/MintNFT';

export const DbkChainEntry = () => {
  const { path } = useRouteMatch();
  const { chainId } = useParams<{ chainId: string }>();

  return (
    <div
      className="bg-r-neutral-bg2 h-full"
      style={{
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <EcologyNavBar className="sticky top-0" chainId={+chainId} />
      <Switch>
        <Route exact path={path}>
          <DbkChainHome />
        </Route>
        <Route path={`${path}/mintNft`}>
          <DbkChainMintNFT />
        </Route>
        <Route path={`${path}/bridge`}>
          <DbkChainBridge />
        </Route>
      </Switch>
    </div>
  );
};
