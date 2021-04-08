import React, { useEffect, useState } from "react";
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import { EthProvider } from 'popup/utils';
import { PrivateRoute } from 'popup/component';
import ImportEntry from './ImportEntry';
import ImportKey from './ImportKey';
import Dashboard from './Dashboard';
import Settings from './Settings';
import Address from './Address';
import ConnectedSites from './ConnectedSites';
import Approval from './Approval';
import SortHat from './SortHat';
import Unlock from './Unlock';

const App = ({ eth }) => (
  <EthProvider eth={eth}>
    <Router>
      <main className="p-6 relative h-full">
        <Switch>
          <Route exact path="/import"><ImportEntry /></Route>
          <Route exact path="/import/key"><ImportKey /></Route>
          <Route exact path="/unlock"><Unlock /></Route>

          <PrivateRoute exact path="/dashboard"><Dashboard /></PrivateRoute>
          <PrivateRoute exact path="/approval"><Approval /></PrivateRoute>
          <PrivateRoute exact path="/settings"><Settings /></PrivateRoute>
          <PrivateRoute exact path="/settings/address"><Address /></PrivateRoute>
          <PrivateRoute exact path="/settings/sites"><ConnectedSites /></PrivateRoute>

          <Route path="/"><SortHat /></Route>
        </Switch>
      </main>
    </Router>
  </EthProvider>
);

export default App;
