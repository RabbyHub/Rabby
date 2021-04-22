import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import { WalletProvider } from 'ui/utils';
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
          <Route exact path="/import/mnemonics">
            <ImportMnemonics />
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
  </WalletProvider>
);

export default App;
