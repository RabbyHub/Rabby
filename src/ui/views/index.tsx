import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { WalletProvider, usePopupOpen } from 'ui/utils';
import ReactGA, { ga } from 'react-ga';

import Dashboard from './Dashboard';
import Unlock from './Unlock';
import NoAddress from './NoAddress';
import CreatePassword from './CreatePassword';
import { StartChainManagement } from './ChainManagement';

const ImportMode = lazy(() => import('./ImportMode'));
const ImportPrivateKey = lazy(() => import('./ImportPrivateKey'));
const ImportJson = lazy(() => import('./ImportJson'));
const ImportMnemonics = lazy(() => import('./ImportMnemonics'));
const ImportWatchAddress = lazy(() => import('./ImportWatchAddress'));
const SelectAddress = lazy(() => import('./SelectAddress'));
const ImportSuccess = lazy(() => import('./ImportSuccess'));
const ImportHardware = lazy(() => import('./ImportHardware'));
const ImportLedgerPathSelect = lazy(
  () => import('./ImportHardware/LedgerHdPath')
);
const Settings = lazy(() => import('./Settings'));
const ConnectedSites = lazy(() => import('./ConnectedSites'));
const Approval = lazy(() => import('./Approval'));
const SortHat = lazy(() => import('./SortHat'));
const CreateMnemonics = lazy(() => import('./CreateMnemonics'));
const AddAddress = lazy(() => import('./AddAddress'));
const ChainManagement = lazy(() => import('./ChainManagement'));
const AddressManagement = lazy(() => import('./AddressManagement'));

ReactGA.initialize('UA-196541140-1');
// eslint-disable-next-line @typescript-eslint/no-empty-function
ga('set', 'checkProtocolTask', function () {});
ga('require', 'displayfeatures');

const LogPageView = () => {
  ReactGA.pageview(window.location.hash);

  return null;
};

const Main = () => {
  usePopupOpen();

  return (
    <Router>
      <Suspense fallback={null}>
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

          <Route exact path="/unlock">
            <Unlock />
          </Route>

          <Route exact path="/dashboard">
            <Dashboard />
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

          <Route path="/">
            <SortHat />
          </Route>
        </Switch>
      </Suspense>
    </Router>
  );
};

const App = ({ wallet }: { wallet: any }) => (
  <WalletProvider wallet={wallet}>
    <Main />
  </WalletProvider>
);

export default App;
