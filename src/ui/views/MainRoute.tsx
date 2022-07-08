import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import ReactGA, { ga } from 'react-ga';
import { PrivateRoute } from 'ui/component';

import Welcome from './Welcome';
import NoAddress from './NoAddress';
import CreatePassword from './CreatePassword';
import Approval from './Approval';
import ChainManagement, { StartChainManagement } from './ChainManagement';
import { getUiType, useWallet } from '../utils';
ReactGA.initialize('UA-199755108-1');
// eslint-disable-next-line @typescript-eslint/no-empty-function
ga('set', 'checkProtocolTask', function () {});
ga('set', 'appName', 'Rabby');
ga('set', 'appVersion', process.env.release);
ga('require', 'displayfeatures');

const LogPageView = () => {
  ReactGA.pageview(window.location.hash);

  return null;
};

const History = React.lazy(() => import('./History'));
const Activities = React.lazy(() => import('./Activities'));
const ChainList = React.lazy(() => import('./ChainList'));
const AddressManagement = React.lazy(() => import('./AddressManagement'));
const ImportLedgerPathSelect = React.lazy(
  () => import('./ImportHardware/LedgerHdPath')
);
const AddAddress = React.lazy(() => import('./AddAddress'));
const CreateMnemonics = React.lazy(() => import('./CreateMnemonics'));
const TokenApproval = React.lazy(() => import('./TokenApproval'));
const NFTApproval = React.lazy(() => import('./NFTApproval'));
const SendToken = React.lazy(() => import('./SendToken'));
const SendNFT = React.lazy(() => import('./SendNFT'));
const GnosisTransactionQueue = React.lazy(
  () => import('./GnosisTransactionQueue')
);
const ConnectLedger = React.lazy(
  () => import('./ImportHardware/LedgerConnect')
);
const QRCodeReader = React.lazy(() => import('./QRCodeReader'));
const AdvancedSettings = React.lazy(() => import('./AdvanceSettings'));
const RequestPermission = React.lazy(() => import('./RequestPermission'));
const Receive = React.lazy(() => import('./Receive/index'));
const WalletConnectTemplate = React.lazy(() => import('./WalletConnect'));
const AddressDetail = React.lazy(() => import('./AddressDetail'));
const AddressBackupMnemonics = React.lazy(
  () => import('./AddressBackup/Mnemonics')
);
const AddressBackupPrivateKey = React.lazy(
  () => import('./AddressBackup/PrivateKey')
);
const ImportWatchAddress = React.lazy(() => import('./ImportWatchAddress'));
const ImportQRCodeBase = React.lazy(() => import('./ImportQRCodeBase'));
const SelectAddress = React.lazy(() => import('./SelectAddress'));
const ImportMoreAddress = React.lazy(() => import('./ImportMoreAddress'));
const ImportSuccess = React.lazy(() => import('./ImportSuccess'));
const ImportHardware = React.lazy(() => import('./ImportHardware'));
const ImportGnosis = React.lazy(() => import('./ImportGnosisAddress'));
const ImportMode = React.lazy(() => import('./ImportMode'));
const ImportPrivateKey = React.lazy(() => import('./ImportPrivateKey'));
const ImportJson = React.lazy(() => import('./ImportJson'));
const InputMnemonics = React.lazy(
  () => import('./ImportMnemonics/InputMnemonics')
);
const EntryImportAddress = React.lazy(
  () => import('./ImportMnemonics/EntryImportAddress')
);
const ConfirmMnemonics = React.lazy(
  () => import('./ImportMnemonics/ConfirmMnemonics')
);
const ConnectedSites = React.lazy(() => import('./ConnectedSites'));

const Main = () => {
  const wallet = useWallet();

  useEffect(() => {
    (async () => {
      const UIType = getUiType();
      if (UIType.isNotification || UIType.isPop) {
        const hasOtherProvider = await wallet.getHasOtherProvider();
        ReactGA.event({
          category: 'User',
          action: 'active',
          label: UIType.isPop
            ? `popup|${hasOtherProvider ? 'hasMetaMask' : 'noMetaMask'}`
            : `request|${hasOtherProvider ? 'hasMetaMask' : 'noMetaMask'}`,
        });
      }
    })();
  }, []);

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
        <PrivateRoute exact path="/mnemonics/risk-check">
          <CreateMnemonics />
        </PrivateRoute>
        <Redirect exact path="/create-mnemonics" to="/mnemonics/create" />
        <PrivateRoute exact path="/mnemonics/create">
          <CreateMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/import">
          <ImportMode />
        </PrivateRoute>
        <PrivateRoute exact path="/import/entry-import-address">
          <EntryImportAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/import/key">
          <ImportPrivateKey />
        </PrivateRoute>
        <PrivateRoute exact path="/import/json">
          <ImportJson />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics">
          <InputMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/mnemonics-confirm">
          <ConfirmMnemonics isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics-confirm">
          <ConfirmMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/mnemonics-import-more-address">
          <ImportMoreAddress isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/mnemonics-import-more-address">
          <ImportMoreAddress />
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
          <ConnectLedger />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/ledger">
          <ImportLedgerPathSelect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/watch-address">
          <ImportWatchAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/import/qrcode">
          <ImportQRCodeBase />
        </PrivateRoute>
        <PrivateRoute exact path="/import/wallet-connect">
          <WalletConnectTemplate />
        </PrivateRoute>
        <PrivateRoute exact path="/popup/import/success">
          <ImportSuccess isPopup />
        </PrivateRoute>
        <PrivateRoute exact path="/import/success">
          <ImportSuccess />
        </PrivateRoute>
        <PrivateRoute exact path="/history">
          <History />
        </PrivateRoute>
        <PrivateRoute exact path="/activities">
          <Activities />
        </PrivateRoute>
        <PrivateRoute exact path="/gnosis-queue">
          <GnosisTransactionQueue />
        </PrivateRoute>
        <PrivateRoute exact path="/import/gnosis">
          <ImportGnosis />
        </PrivateRoute>
        <PrivateRoute exact path="/add-address">
          <AddAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/approval">
          <Approval />
        </PrivateRoute>
        <PrivateRoute exact path="/token-approval">
          <TokenApproval />
        </PrivateRoute>
        <PrivateRoute exact path="/nft-approval">
          <NFTApproval />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address">
          <AddressManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address-detail">
          <AddressDetail />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address-backup/private-key">
          <AddressBackupPrivateKey />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/address-backup/mneonics">
          <AddressBackupMnemonics />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/sites">
          <ConnectedSites />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/chain">
          <ChainManagement />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/chain-list">
          <ChainList />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/advanced">
          <AdvancedSettings />
        </PrivateRoute>
        <PrivateRoute exact path="/qrcode-reader">
          <QRCodeReader />
        </PrivateRoute>
        <PrivateRoute exact path="/request-permission">
          <RequestPermission />
        </PrivateRoute>
        <PrivateRoute exact path="/send-token">
          <SendToken />
        </PrivateRoute>
        <PrivateRoute exact path="/send-nft">
          <SendNFT />
        </PrivateRoute>
        <PrivateRoute exact path="/receive">
          <Receive />
        </PrivateRoute>
      </Switch>
    </>
  );
};

export default Main;
