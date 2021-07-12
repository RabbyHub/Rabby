import React from 'react';
import { Switch, Route } from 'react-router-dom';
import ReactGA, { ga } from 'react-ga';
import { PrivateRoute } from 'ui/component';

import Welcome from './Welcome';
import NoAddress from './NoAddress';
import CreatePassword from './CreatePassword';
import ImportMode from './ImportMode';
import ImportPrivateKey from './ImportPrivateKey';
import ImportJson from './ImportJson';
import ImportMnemonics from './ImportMnemonics';
import ImportWatchAddress from './ImportWatchAddress';
import SelectAddress from './SelectAddress';
import ImportSuccess from './ImportSuccess';
import ImportHardware from './ImportHardware';
import ImportLedgerPathSelect from './ImportHardware/LedgerHdPath';
import ConnectLedgerMethodSelect from './ImportHardware/LedgerConnectMethod';
import Settings from './Settings';
import ConnectedSites from './ConnectedSites';
import Approval from './Approval';
import CreateMnemonics from './CreateMnemonics';
import AddAddress from './AddAddress';
import ChainManagement, { StartChainManagement } from './ChainManagement';
import AddressManagement from './AddressManagement';
import SwitchLang from './SwitchLang';

ReactGA.initialize('UA-199755108-1');
// eslint-disable-next-line @typescript-eslint/no-empty-function
ga('set', 'checkProtocolTask', function () {});
ga('require', 'displayfeatures');

const LogPageView = () => {
  ReactGA.pageview(window.location.hash);

  return null;
};

const Main = () => {
  return (
    <>
      <Route path="/" component={LogPageView} />
      <Switch>
        <Route exact path="/welcome">
          <Welcome />
        </Route>
        <Route exact path="/password">
          <CreatePassword />
        </Route>

        <PrivateRoute exact path="/no-address">
          <NoAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/start-chain-management">
          <StartChainManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/create-mnemonics">
          <CreateMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/import">
          <ImportMode />
        </PrivateRoute>
        <PrivateRoute exact path="/import/key">
          <ImportPrivateKey />
        </PrivateRoute>
        <PrivateRoute exact path="/import/json">
          <ImportJson />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics">
          <ImportMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/select-address">
          <SelectAddress isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/select-address">
          <SelectAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware">
          <ImportHardware />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/ledger-connect">
          <ConnectLedgerMethodSelect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/ledger">
          <ImportLedgerPathSelect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/watch-address">
          <ImportWatchAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/success">
          <ImportSuccess isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/success">
          <ImportSuccess />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address">
          <AddAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/approval">
          <Approval />
        </PrivateRoute>
        <PrivateRoute exact path="/settings">
          <Settings />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address">
          <AddressManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/sites">
          <ConnectedSites />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/chain">
          <ChainManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/switch-lang">
          <SwitchLang />
        </PrivateRoute>
      </Switch>
    </>
  );
};

export default Main;
