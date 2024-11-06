import React from 'react';
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom';

import { SonicHome } from './pages/Home';
import { DbkChainMintNFT } from './pages/MintNFT';
import { SonicPoints } from './pages/Points';

export const SonicEntry = () => {
  const { path } = useRouteMatch();
  const { chainId } = useParams<{ chainId: string }>();

  return (
    <Switch>
      <Route exact path={path}>
        <SonicHome />
      </Route>
      <Route path={`${path}/points`}>
        <SonicPoints />
      </Route>
      <Route path={`${path}/mintNft`}>
        <DbkChainMintNFT />
      </Route>
    </Switch>
  );
};
