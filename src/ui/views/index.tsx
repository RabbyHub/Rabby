import React from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { WalletProvider, usePopupOpen } from 'ui/utils';
import ReactGA, { ga } from 'react-ga';
import ImportMode from './ImportMode';
import ImportKey from './ImportKey';
import ImportJson from './ImportJson';
import ImportMnemonics from './ImportMnemonics';
import ImportHardware from './ImportHardware';
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
// import { Wallet } from 'background/controller/wallet';

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
      <main className="relative min-h-full">
        <Route path="/" component={LogPageView} />
        <Switch>
          <Route exact path="/password">
            <CreatePassword />
          </Route>
          <Route exact path="/start">
            <Start />
          </Route>
          <Route exact path="/create">
            <CreateMnemonics />
          </Route>
          <Route exact path="/import">
            <ImportMode />
          </Route>
          <Route exact path="/import/key">
            <ImportKey />
          </Route>
          <Route exact path="/import/json">
            <ImportJson />
          </Route>
          <Route exact path="/import/mnemonics">
            <ImportMnemonics />
          </Route>
          <Route exact path="/import/hardware">
            <ImportHardware />
          </Route>

          <Route exact path="/unlock">
            <Unlock />
          </Route>

          <Route exact path="/dashboard">
            <Dashboard />
          </Route>
          <Route exact path="/approval">
            <Approval />
          </Route>
          <Route exact path="/settings">
            <Settings />
          </Route>
          <Route exact path="/settings/address">
            <Address />
          </Route>
          <Route exact path="/settings/sites">
            <ConnectedSites />
          </Route>

          <Route path="/">
            <SortHat />
          </Route>
        </Switch>
      </main>
    </Router>
  );
};

const App = ({ wallet }: { wallet: any }) => (
  <WalletProvider wallet={wallet}>
    <Main />
  </WalletProvider>
);

export default App;
