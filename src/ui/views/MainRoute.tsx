import React, { useEffect } from 'react';
import { Switch, Route } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';

import Welcome from './Welcome';
import NoAddress from './NoAddress';
import CreatePassword from './CreatePassword';
import ImportMode from './ImportMode';
import ImportPrivateKey from './ImportPrivateKey';
import ImportJson from './ImportJson';
import ImportWatchAddress from './ImportWatchAddress';
import SelectAddress from './SelectAddress';
import ImportSuccess from './ImportSuccess';
import ImportGnosis from './ImportGnosisAddress';
import ConnectLedger from './ImportHardware/LedgerConnect';
import ConnectedSites from './ConnectedSites';
import Approval from './Approval';
import TokenApproval from './TokenApproval';
import NFTApproval from './NFTApproval';
import AddAddress from './AddAddress';
import ChainList from './ChainList';
import AddressManagement from './AddressManagement';
import SwitchLang from './SwitchLang';
import Activities from './Activities';
import { HistoryPage } from './History';
import AdvancedSettings from './AdvanceSettings';
import RequestPermission from './RequestPermission';
import SendToken from './SendToken';
import SendNFT from './SendNFT';
import Receive from './Receive/index';
import WalletConnectTemplate from './WalletConnect';
import AddressDetail from './AddressDetail';
import AddressBackupMnemonics from './AddressBackup/Mnemonics';
import AddressBackupPrivateKey from './AddressBackup/PrivateKey';
import Swap from './Swap';
import { getUiType, useWallet } from '../utils';
import CustomRPC from './CustomRPC';
import { ImportMyMetaMaskAccount } from './ImportMyMetaMaskAccount';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { CommonPopup } from './CommonPopup';
import ManageAddress from './ManageAddress';
import { NFTView } from './NFTView';
import { QRCodeConnect } from './ImportHardware/QRCodeConnect';
import { KeystoneConnect } from './ImportHardware/KeystoneConnect';
import ApprovalManagePage from './ApprovalManagePage';
import { ImportCoboArgus } from './ImportCoboArgus/ImportCoboArgus';
import { ImportCoinbase } from './ImportCoinbase/ImportCoinbase';
import { DappSearchPage } from './DappSearch';
import RabbyPoints from './RabbyPoints';
import { ImKeyConnect } from './ImportHardware/ImKeyConnect';
import InputMnemonics from './ImportMnemonics/InputMnemonics';
import CreateMnemonics from './CreateMnemonics';
import ImportHardware from './ImportHardware';
import { CustomTestnet } from './CustomTestnet';
import { AddFromCurrentSeedPhrase } from './AddFromCurrentSeedPhrase';
import { Ecology } from './Ecology';
import { Bridge } from './Bridge';
import { GasAccount } from './GasAccount';
import { GnosisQueue } from './GnosisQueue';
import { Guide } from './NewUserImport/Guide';
import { ImportWalletList } from './NewUserImport/ImportList';
import { CreateSeedPhrase } from './NewUserImport/CreateSeedPhrase';
import { NewUserImportPrivateKey } from './NewUserImport/ImportPrivateKey';
import { NewUserSetPassword } from './NewUserImport/SetPassword';
import { NewUserImportGnosisAddress } from './NewUserImport/ImportGnosisAddress';
import { NewUserImportLedger } from './NewUserImport/ImportLedger';
import { NewUserImportKeystone } from './NewUserImport/ImportKeystone';
import { BackupSeedPhrase } from './NewUserImport/BackupSeedPhrase';
import { ImportOrCreatedSuccess } from './NewUserImport/Success';
import { ReadyToUse } from './NewUserImport/ReadyToUse';
import { ImportSeedPhrase } from './NewUserImport/ImportSeedPhrase';
import { NewUserImportHardware } from './NewUserImport/ImportHardWare';
import { KEYRING_CLASS } from '@/constant';
import { MetamaskModeDapps } from './MetamaskModeDapps';

declare global {
  interface Window {
    _paq: any;
  }
}

const LogPageView = () => {
  if (window._paq) {
    window._paq.push(['setCustomUrl', window.location.hash.replace(/#/, '')]);
    window._paq.push(['trackPageView']);
  }

  return null;
};

const Main = () => {
  const wallet = useWallet();

  useEffect(() => {
    (async () => {
      const UIType = getUiType();
      if (UIType.isNotification || UIType.isPop) {
        const hasOtherProvider = await wallet.getHasOtherProvider();
        matomoRequestEvent({
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
        <Route exact path="/new-user/guide">
          <Guide />
        </Route>

        <Route exact path="/new-user/import-list">
          <ImportWalletList />
        </Route>

        <Route exact path="/new-user/import/private-key">
          <NewUserImportPrivateKey />
        </Route>

        <Route exact path="/new-user/import/gnosis-address">
          <NewUserImportGnosisAddress />
        </Route>

        <Route exact path="/new-user/import/seed-phrase">
          <ImportSeedPhrase />
        </Route>

        <Route
          exact
          path={`/new-user/import/hardware/${KEYRING_CLASS.HARDWARE.LEDGER}`}
        >
          <NewUserImportLedger />
        </Route>

        <Route
          exact
          path={`/new-user/import/hardware/${KEYRING_CLASS.HARDWARE.KEYSTONE}`}
        >
          <NewUserImportKeystone />
        </Route>

        <Route exact path="/new-user/import/hardware/:type">
          <NewUserImportHardware />
        </Route>

        <Route exact path="/new-user/import/:type/set-password">
          <NewUserSetPassword />
        </Route>

        <Route exact path="/new-user/create-seed-phrase">
          <CreateSeedPhrase />
        </Route>

        <Route exact path="/new-user/backup-seed-phrase">
          <BackupSeedPhrase />
        </Route>

        <Route exact path="/new-user/success">
          <ImportOrCreatedSuccess />
        </Route>

        <Route exact path="/new-user/ready">
          <ReadyToUse />
        </Route>

        <Route exact path="/password">
          <CreatePassword />
        </Route>

        <Route exact path="/no-address">
          <NoAddress />
        </Route>
        <PrivateRoute exact path="/mnemonics/create">
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
          <InputMnemonics />
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
        <PrivateRoute exact path="/import/hardware/imkey-connect">
          <ImKeyConnect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/keystone">
          <KeystoneConnect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/qrcode">
          <QRCodeConnect />
        </PrivateRoute>
        <PrivateRoute exact path="/import/watch-address">
          <ImportWatchAddress />
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

        <PrivateRoute exact path="/import/add-from-current-seed-phrase">
          <AddFromCurrentSeedPhrase />
        </PrivateRoute>

        <PrivateRoute exact path="/history">
          <HistoryPage />
        </PrivateRoute>
        <PrivateRoute exact path="/history/filter-scam">
          <HistoryPage isFitlerScam={true} />
        </PrivateRoute>
        <PrivateRoute exact path="/activities">
          <Activities />
        </PrivateRoute>
        <PrivateRoute exact path="/gnosis-queue">
          <GnosisQueue />
        </PrivateRoute>
        <PrivateRoute exact path="/import/gnosis">
          <ImportGnosis />
        </PrivateRoute>
        <PrivateRoute exact path="/import/cobo-argus">
          <ImportCoboArgus />
        </PrivateRoute>
        <PrivateRoute exact path="/import/coinbase">
          <ImportCoinbase />
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
          <ManageAddress />
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
        <PrivateRoute exact path="/settings/chain-list">
          <ChainList />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/switch-lang">
          <SwitchLang />
        </PrivateRoute>
        <PrivateRoute exact path="/settings/advanced">
          <AdvancedSettings />
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

        <PrivateRoute exact path="/bridge">
          <Bridge />
        </PrivateRoute>

        <PrivateRoute exact path="/approval-manage">
          <ApprovalManagePage />
        </PrivateRoute>
        <PrivateRoute exact path="/dapp-search">
          <DappSearchPage />
        </PrivateRoute>

        <PrivateRoute exact path="/import/metamask">
          <ImportMyMetaMaskAccount />
        </PrivateRoute>

        <PrivateRoute exact path="/switch-address">
          <AddressManagement />
        </PrivateRoute>

        <PrivateRoute exact path="/dex-swap">
          <Swap />
        </PrivateRoute>
        <PrivateRoute exact path="/custom-rpc">
          <CustomRPC />
        </PrivateRoute>
        <PrivateRoute exact path="/custom-testnet">
          <CustomTestnet />
        </PrivateRoute>
        <PrivateRoute exact path="/metamask-mode-dapps">
          <MetamaskModeDapps />
        </PrivateRoute>
        <PrivateRoute exact path="/nft">
          <NFTView />
        </PrivateRoute>
        <PrivateRoute exact path="/rabby-points">
          <RabbyPoints />
        </PrivateRoute>
        <PrivateRoute path="/ecology/:chainId">
          <Ecology />
        </PrivateRoute>
        <PrivateRoute path="/gas-account">
          <GasAccount />
        </PrivateRoute>
      </Switch>

      <CommonPopup />
    </>
  );
};

export default Main;
