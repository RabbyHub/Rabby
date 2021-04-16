import React, { useEffect, useState } from "react";
import {
  HashRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import { WalletProvider } from 'ui/helper';
import { PrivateRoute } from 'ui/component';
import ImportMode from './ImportMode';
import ImportKey from './ImportKey';
import ImportMnemonics from './ImportMnemonics';
import Dashboard from './Dashboard';
import Settings from './Settings';
import Address from './Address';
import ConnectedSites from './ConnectedSites';
import Approval from './Approval';
import SortHat from './SortHat';
import Unlock from './Unlock';
import CreatePassword from './CreatePassword';
import Start from './Start';
import CreateMnemonics from './CreateMnemonics';

const App = ({ wallet }) => (
  <WalletProvider wallet={wallet}>
    <Router>
      <main className="p-6 relative min-h-full">
        <Switch>
          <Route exact path="/password"><CreatePassword /></Route>
          <Route exact path="/start"><Start /></Route>
          <Route exact path="/create"><CreateMnemonics /></Route>
          <Route exact path="/import"><ImportMode /></Route>
          <Route exact path="/import/key"><ImportKey /></Route>
          <Route exact path="/import/mnemonics"><ImportMnemonics /></Route>

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
  </WalletProvider>
);

export default App;
