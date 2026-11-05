import React, { Suspense, useEffect } from 'react';
import { Switch, Route } from 'react-router-dom';
import { PrivateRoute } from 'ui/component';
import './routeStyles';
import { getUiType, useWallet } from '../utils';
import { CommonPopup } from './CommonPopup';
import { KEYRING_CLASS } from '@/constant';
import { ga4 } from '@/utils/ga4';
import { getPageViewPath } from '../utils/ga-event';
import { PortalHost } from '../component/PortalHost';
import {
  GlobalSignerPortal,
  GlobalTypedDataSignerPortal,
} from '../component/MiniSignV2/components';

// Each page is its own chunk, loaded the first time its route renders, so the
// popup and the approval window only load the pages they show.
function lazyPage<P extends object>(
  load: () => Promise<React.ComponentType<P>>
) {
  // React.lazy's ref-aware props type doesn't line up with a generic P
  const Page = (React.lazy(() =>
    load().then((Component) => ({ default: Component }))
  ) as unknown) as React.ComponentType<P>;
  const LazyPage = (props: P) => (
    <Suspense fallback={null}>
      <Page {...props} />
    </Suspense>
  );
  return LazyPage;
}

const Welcome = lazyPage(() => import('./Welcome').then((m) => m.default));
const NoAddress = lazyPage(() => import('./NoAddress').then((m) => m.default));
const CreatePassword = lazyPage(() =>
  import('./CreatePassword').then((m) => m.default)
);
const ImportMode = lazyPage(() =>
  import('./ImportMode').then((m) => m.default)
);
const ImportPrivateKey = lazyPage(() =>
  import('./ImportPrivateKey').then((m) => m.default)
);
const ImportJson = lazyPage(() =>
  import('./ImportJson').then((m) => m.default)
);
const ImportWatchAddress = lazyPage(() =>
  import('./ImportWatchAddress').then((m) => m.default)
);
const SelectAddress = lazyPage(() =>
  import('./SelectAddress').then((m) => m.default)
);
const ImportSuccess = lazyPage(() =>
  import('./ImportSuccess').then((m) => m.default)
);
const ImportGnosis = lazyPage(() =>
  import('./ImportGnosisAddress').then((m) => m.default)
);
const ConnectLedger = lazyPage(() =>
  import('./ImportHardware/LedgerConnect').then((m) => m.default)
);
const ConnectTrezor = lazyPage(() =>
  import('./ImportHardware/TrezorConnect').then((m) => m.default)
);
const ConnectOneKey = lazyPage(() =>
  import('./ImportHardware/OneKeyConnect').then((m) => m.default)
);
const ConnectedSites = lazyPage(() =>
  import('./ConnectedSites').then((m) => m.default)
);
const Approval = lazyPage(() => import('./Approval').then((m) => m.default));
const TokenApproval = lazyPage(() =>
  import('./TokenApproval').then((m) => m.default)
);
const NFTApproval = lazyPage(() =>
  import('./NFTApproval').then((m) => m.default)
);
const AddAddress = lazyPage(() =>
  import('./AddAddress').then((m) => m.default)
);
const ChainList = lazyPage(() => import('./ChainList').then((m) => m.default));
const AddressManagement = lazyPage(() =>
  import('./AddressManagement').then((m) => m.default)
);
const SwitchLang = lazyPage(() =>
  import('./SwitchLang').then((m) => m.default)
);
const Activities = lazyPage(() =>
  import('./Activities').then((m) => m.default)
);
const HistoryPage = lazyPage(() =>
  import('./History').then((m) => m.HistoryPage)
);
const PerpsSingleCoin = lazyPage(() =>
  import('./Perps/screen/SingleCoin').then((m) => m.default)
);
const PerpsHistoryPage = lazyPage(() =>
  import('./Perps/screen/HistoryPage').then((m) => m.HistoryPage)
);
const ExploreMore = lazyPage(() =>
  import('./Perps/screen/ExploreMore').then((m) => m.default)
);
const Staking = lazyPage(() => import('./Staking').then((m) => m.default));
const StakingDetail = lazyPage(() =>
  import('./Staking/Detail').then((m) => m.default)
);
const AdvancedSettings = lazyPage(() =>
  import('./AdvanceSettings').then((m) => m.default)
);
const RequestPermission = lazyPage(() =>
  import('./RequestPermission').then((m) => m.default)
);
const SendToken = lazyPage(() => import('./SendToken').then((m) => m.default));
const SendNFT = lazyPage(() => import('./SendNFT').then((m) => m.default));
const Receive = lazyPage(() =>
  import('./Receive/index').then((m) => m.default)
);
const WalletConnectTemplate = lazyPage(() =>
  import('./WalletConnect').then((m) => m.default)
);
const AddressDetail = lazyPage(() =>
  import('./AddressDetail').then((m) => m.default)
);
const AddressBackupMnemonics = lazyPage(() =>
  import('./AddressBackup/Mnemonics').then((m) => m.default)
);
const AddressBackupPrivateKey = lazyPage(() =>
  import('./AddressBackup/PrivateKey').then((m) => m.default)
);
const Swap = lazyPage(() => import('./Swap').then((m) => m.default));
const CustomRPC = lazyPage(() => import('./CustomRPC').then((m) => m.default));
const ImportMyMetaMaskAccount = lazyPage(() =>
  import('./ImportMyMetaMaskAccount').then((m) => m.ImportMyMetaMaskAccount)
);
const ManageAddress = lazyPage(() =>
  import('./ManageAddress').then((m) => m.default)
);
const NFTView = lazyPage(() => import('./NFTView').then((m) => m.NFTView));
const QRCodeConnect = lazyPage(() =>
  import('./ImportHardware/QRCodeConnect').then((m) => m.QRCodeConnect)
);
const KeystoneConnect = lazyPage(() =>
  import('./ImportHardware/KeystoneConnect').then((m) => m.KeystoneConnect)
);
const ImportCoboArgus = lazyPage(() =>
  import('./ImportCoboArgus/ImportCoboArgus').then((m) => m.ImportCoboArgus)
);
const ImportCoinbase = lazyPage(() =>
  import('./ImportCoinbase/ImportCoinbase').then((m) => m.ImportCoinbase)
);
const DappSearchPage = lazyPage(() =>
  import('./DappSearch').then((m) => m.DappSearchPage)
);
const RabbyPoints = lazyPage(() =>
  import('./RabbyPoints').then((m) => m.default)
);
const ImKeyConnect = lazyPage(() =>
  import('./ImportHardware/ImKeyConnect').then((m) => m.ImKeyConnect)
);
const InputMnemonics = lazyPage(() =>
  import('./ImportMnemonics/InputMnemonics').then((m) => m.default)
);
const CreateMnemonics = lazyPage(() =>
  import('./CreateMnemonics').then((m) => m.default)
);
const ImportHardware = lazyPage(() =>
  import('./ImportHardware').then((m) => m.default)
);
const CustomTestnet = lazyPage(() =>
  import('./CustomTestnet').then((m) => m.CustomTestnet)
);
const AddFromCurrentSeedPhrase = lazyPage(() =>
  import('./AddFromCurrentSeedPhrase').then((m) => m.AddFromCurrentSeedPhrase)
);
const AddNewAddress = lazyPage(() =>
  import('./AddAddress/AddNewAddress').then((m) => m.AddNewAddress)
);
const AddMoreAddressesFromSeedPhrase = lazyPage(() =>
  import('./AddAddress/AddMoreAddressesFromSeedPhrase').then(
    (m) => m.AddMoreAddressesFromSeedPhrase
  )
);
const CreateAddressSuccess = lazyPage(() =>
  import('./AddAddress/CreateAddressSuccess').then(
    (m) => m.CreateAddressSuccess
  )
);
const ImportAddressSuccess = lazyPage(() =>
  import('./AddAddress/ImportAddressSuccess').then((m) => m.default)
);
const HardwareWallets = lazyPage(() =>
  import('./AddAddress/HardwareWallets').then((m) => m.HardwareWallets)
);
const BulkImportPrivateKey = lazyPage(() =>
  import('./AddAddress/BulkImportPrivateKey').then((m) => m.default)
);
const ImportKeyOrSeed = lazyPage(() =>
  import('./AddAddress/ImportKeyOrSeed').then((m) => m.default)
);
const InstitutionalWallets = lazyPage(() =>
  import('./AddAddress/InstitutionalWallets').then(
    (m) => m.InstitutionalWallets
  )
);
const Ecology = lazyPage(() => import('./Ecology').then((m) => m.Ecology));
const Bridge = lazyPage(() => import('./Bridge').then((m) => m.Bridge));
const GasAccount = lazyPage(() =>
  import('./GasAccount').then((m) => m.GasAccount)
);
const GnosisQueue = lazyPage(() =>
  import('./GnosisQueue').then((m) => m.GnosisQueue)
);
const Perps = lazyPage(() =>
  import('./Perps/screen/home').then((m) => m.default)
);
const Guide = lazyPage(() =>
  import('./NewUserImport/Guide').then((m) => m.Guide)
);
const CreateSeedPhrase = lazyPage(() =>
  import('./NewUserImport/CreateSeedPhrase').then((m) => m.CreateSeedPhrase)
);
const NewUserSetPassword = lazyPage(() =>
  import('./NewUserImport/SetPassword').then((m) => m.NewUserSetPassword)
);
const NewUserImportGnosisAddress = lazyPage(() =>
  import('./NewUserImport/ImportGnosisAddress').then(
    (m) => m.NewUserImportGnosisAddress
  )
);
const NewUserImportLedger = lazyPage(() =>
  import('./NewUserImport/ImportLedger').then((m) => m.NewUserImportLedger)
);
const NewUserImportImKey = lazyPage(() =>
  import('./NewUserImport/ImportImKey').then((m) => m.NewUserImportImKey)
);
const NewUserImportKeystone = lazyPage(() =>
  import('./NewUserImport/ImportKeystone').then((m) => m.NewUserImportKeystone)
);
const NewUserImportOneKey = lazyPage(() =>
  import('./NewUserImport/ImportOnekey').then((m) => m.NewUserImportOneKey)
);
const BackupSeedPhrase = lazyPage(() =>
  import('./NewUserImport/BackupSeedPhrase').then((m) => m.BackupSeedPhrase)
);
const ImportOrCreatedSuccess = lazyPage(() =>
  import('./NewUserImport/Success').then((m) => m.ImportOrCreatedSuccess)
);
const ReadyToUse = lazyPage(() =>
  import('./NewUserImport/ReadyToUse').then((m) => m.ReadyToUse)
);
const NewUserImportHardware = lazyPage(() =>
  import('./NewUserImport/ImportHardWare').then((m) => m.NewUserImportHardware)
);
const MetamaskModeDappsGuide = lazyPage(() =>
  import('./MetamaskModeDapps').then((m) => m.MetamaskModeDappsGuide)
);
const MetamaskModeDappsList = lazyPage(() =>
  import('./MetamaskModeDapps').then((m) => m.MetamaskModeDappsList)
);
const NewUserSelectAddress = lazyPage(() =>
  import('./NewUserImport/SelectAddress').then((m) => m.NewUserSelectAddress)
);
const ConnectApproval = lazyPage(() =>
  import('./Approval/components/Connect/SelectWalletApproval').then(
    (m) => m.ConnectApproval
  )
);
const SyncToMobile = lazyPage(() =>
  import('../utils/SyncToMobile/SyncToMobile').then((m) => m.SyncToMobile)
);
const WhitelistInput = lazyPage(() =>
  import('./WhitelistInput').then((m) => m.default)
);
const SelectToAddress = lazyPage(() =>
  import('./SelectToAddress').then((m) => m.default)
);
const ImportWalletType = lazyPage(() =>
  import('./NewUserImport/ImportWalletType').then((m) => m.ImportWalletType)
);
const ImportHardwareList = lazyPage(() =>
  import('./NewUserImport/importHardwareList').then((m) => m.ImportHardwareList)
);
const ImportSeedOrKey = lazyPage(() =>
  import('./NewUserImport/ImportSeedOrKey').then((m) => m.ImportSeedOrKey)
);
const BiometricUnlockSetup = lazyPage(() =>
  import('./BiometricUnlockSetup').then((m) => m.BiometricUnlockSetup)
);
const ManageApprovals = lazyPage(() =>
  import('./ManageApprovals').then((m) => m.ManageApprovals)
);
const ManageBatchRevokeApprovals = lazyPage(() =>
  import('./ManageBatchApprovals').then((m) => m.ManageBatchRevokeApprovals)
);

const LogPageView = () => {
  const path = getPageViewPath(window.location.hash);

  useEffect(() => {
    ga4.firePageViewEvent({
      pageLocation: path,
    });
  }, [path]);

  return null;
};

const Main = () => {
  const wallet = useWallet();

  useEffect(() => {
    (async () => {
      const UIType = getUiType();
      if (UIType.isNotification || UIType.isPop) {
        const hasOtherProvider = await wallet.getHasOtherProvider();
        ga4.fireEvent(
          UIType.isPop
            ? `Popup_${hasOtherProvider ? 'HasMM' : 'NoMM'}`
            : `Request_${hasOtherProvider ? 'HasMM' : 'NoMM'}`,
          {
            event_category: 'User Active',
          }
        );
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

        {/* todo remove */}
        <Route exact path="/sync">
          <SyncToMobile />
        </Route>

        <Route exact path="/new-user/guide">
          <Guide />
        </Route>

        <Route exact path="/new-user/import-wallet-type">
          <ImportWalletType />
        </Route>

        <Route exact path="/new-user/import-hardware-list">
          <ImportHardwareList />
        </Route>

        <Route exact path="/new-user/import/gnosis-address">
          <NewUserImportGnosisAddress />
        </Route>

        <Route exact path="/new-user/import/seed-or-key">
          <ImportSeedOrKey />
        </Route>

        <Route
          exact
          path={`/new-user/import/hardware/${KEYRING_CLASS.HARDWARE.LEDGER}`}
        >
          <NewUserImportLedger />
        </Route>

        <Route
          exact
          path={`/new-user/import/hardware/${KEYRING_CLASS.HARDWARE.IMKEY}`}
        >
          <NewUserImportImKey />
        </Route>

        <Route
          exact
          path={`/new-user/import/hardware/${KEYRING_CLASS.HARDWARE.KEYSTONE}`}
        >
          <NewUserImportKeystone />
        </Route>

        <Route
          exact
          path={`/new-user/import/hardware/${KEYRING_CLASS.HARDWARE.ONEKEY}`}
        >
          <NewUserImportOneKey />
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

        <Route exact path="/new-user/import/select-address">
          <NewUserSelectAddress />
        </Route>

        <Route exact path="/password">
          <CreatePassword />
        </Route>

        <Route exact path="/no-address">
          <NoAddress />
        </Route>

        <Route exact path="/connect-approval">
          <ConnectApproval />
        </Route>

        <PrivateRoute exact path="/mnemonics/create">
          <CreateMnemonics />
        </PrivateRoute>
        <Route exact path="/biometric-unlock-setup">
          <BiometricUnlockSetup />
        </Route>
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
        <PrivateRoute exact path="/import/hardware/trezor-connect">
          <ConnectTrezor />
        </PrivateRoute>
        <PrivateRoute exact path="/import/hardware/onekey">
          <ConnectOneKey />
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

        <PrivateRoute exact path="/add-address/new-address">
          <AddNewAddress />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/import">
          <ImportKeyOrSeed />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/bulk-import-private-key">
          <BulkImportPrivateKey />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/create-address-success">
          <CreateAddressSuccess />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/import-address-success">
          <ImportAddressSuccess />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/add-more-from-seed-phrase">
          <AddMoreAddressesFromSeedPhrase />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/hardware-wallets">
          <HardwareWallets />
        </PrivateRoute>

        <PrivateRoute exact path="/add-address/institutional-wallets">
          <InstitutionalWallets />
        </PrivateRoute>

        <PrivateRoute exact path="/history">
          <HistoryPage />
        </PrivateRoute>
        <PrivateRoute exact path="/history/filter-scam">
          <HistoryPage />
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
        <PrivateRoute exact path="/revoke-approvals/batch-revoke">
          <ManageBatchRevokeApprovals />
        </PrivateRoute>
        <PrivateRoute exact path="/revoke-approvals">
          <ManageApprovals />
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
        <PrivateRoute exact path="/select-to-address">
          <SelectToAddress />
        </PrivateRoute>
        <PrivateRoute exact path="/send-nft">
          <SendNFT />
        </PrivateRoute>
        <PrivateRoute exact path="/whitelist-input">
          <WhitelistInput />
        </PrivateRoute>
        <PrivateRoute exact path="/receive">
          <Receive />
        </PrivateRoute>

        <PrivateRoute exact path="/bridge">
          <Bridge />
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
          <MetamaskModeDappsGuide />
        </PrivateRoute>
        <PrivateRoute exact path="/metamask-mode-dapps/list">
          <MetamaskModeDappsList />
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
        <PrivateRoute exact path="/perps">
          <Perps />
        </PrivateRoute>
        <PrivateRoute exact path="/perps/single-coin/:coin">
          <PerpsSingleCoin />
        </PrivateRoute>
        <PrivateRoute exact path="/perps/explore">
          <ExploreMore />
        </PrivateRoute>
        <PrivateRoute exact path="/perps/history/:coin">
          <PerpsHistoryPage />
        </PrivateRoute>
        <PrivateRoute exact path="/staking">
          <Staking />
        </PrivateRoute>
        <PrivateRoute exact path="/staking/detail">
          <StakingDetail />
        </PrivateRoute>
      </Switch>

      <CommonPopup />
      <PortalHost />
      <GlobalSignerPortal />
      <GlobalTypedDataSignerPortal />
    </>
  );
};

export default Main;
