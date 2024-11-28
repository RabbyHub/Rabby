import React from 'react';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

import { SonicHome } from './pages/Home';
import { SonicPoints } from './pages/Points';

export const SonicEntry = () => {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route exact path={path}>
        <SonicHome />
      </Route>
      <Route path={`${path}/points`}>
        <SonicPoints />
      </Route>
    </Switch>
  );
};
