import React from 'react';
import { Switch, Route } from 'react-router-dom';
import ReactGA, { ga } from 'react-ga';

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
import Settings from './Settings';
import ConnectedSites from './ConnectedSites';
import Approval from './Approval';
import SortHat from './SortHat';
import CreateMnemonics from './CreateMnemonics';
import AddAddress from './AddAddress';
import ChainManagement, { StartChainManagement } from './ChainManagement';
import AddressManagement from './AddressManagement';

ReactGA.initialize('UA-196541140-1');
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
        <Route exact path="/password">
          <CreatePassword />
        </Route>
        <Route exact path="/start-chain-management">
          <StartChainManagement />
        </Route>
        <Route exact path="/no-address">
          <NoAddress />
        </Route>
        <Route exact path="/create">
          <CreateMnemonics />
        </Route>
        <Route exact path="/import">
          <ImportMode />
        </Route>
        <Route exact path="/import/key">
          <ImportPrivateKey />
        </Route>
        <Route exact path="/import/json">
          <ImportJson />
        </Route>
        <Route exact path="/import/mnemonics">
          <ImportMnemonics />
        </Route>
        <Route exact path="/import/select-address">
          <SelectAddress />
        </Route>
        <Route exact path="/import/hardware">
          <ImportHardware />
        </Route>
        <Route exact path="/import/hardware/ledger">
          <ImportLedgerPathSelect />
        </Route>
        <Route exact path="/import/watch-address">
          <ImportWatchAddress />
        </Route>
        <Route exact path="/import/success">
          <ImportSuccess />
        </Route>
        <Route exact path="/add-address">
          <AddAddress />
        </Route>
        <Route exact path="/approval">
          <Approval />
        </Route>
        <Route exact path="/settings">
          <Settings />
        </Route>
        <Route exact path="/settings/address">
          <AddressManagement />
        </Route>
        <Route exact path="/settings/sites">
          <ConnectedSites />
        </Route>
        <Route exact path="/settings/chain">
          <ChainManagement />
        </Route>
        <Route exact path="/">
          <SortHat />
        </Route>
      </Switch>
    </>
  );
};

export default Main;
