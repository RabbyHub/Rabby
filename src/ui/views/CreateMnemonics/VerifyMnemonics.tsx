import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form } from 'antd';
import { StrayPageWithButton, TiledSelect } from 'ui/component';
import { useWallet } from 'ui/utils';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import { generateAliasName } from '@/utils/account';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_TYPE } from '@/constant';
import { Account } from '@/background/service/preference';

const VerifyMnemonics = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [errMsg, setErrMsg] = useState('');
  const isWide = useMedia('(min-width: 401px)');

  const dispatch = useRabbyDispatch();
  React.useEffect(() => {
    dispatch.createMnemonics.prepareMnemonicsAsync();
    dispatch.account.getAllClassAccountsAsync();
  }, []);
  const { mnemonics } = useRabbySelector((s) => ({
    mnemonics: s.createMnemonics.mnemonics,
  }));
  const randomMnemonics = useRabbyGetter(
    (s) => s.createMnemonics.randomMnemonics
  );
  const correctValue = React.useMemo(() => mnemonics.split(' '), [mnemonics]);

  const onSubmit = React.useCallback(
    (values: { mnemonics: string[] }) => {
      const mnemonicsList = (values.mnemonics || []).filter(Boolean);
      if (!mnemonicsList || mnemonicsList.length <= 0) {
        setErrMsg(t('page.newAddress.seedPhrase.pleaseSelectWords'));
        return;
      }

      if (mnemonicsList.join(' ') !== mnemonics) {
        setErrMsg(t('page.newAddress.seedPhrase.verificationFailed'));
        return;
      }
      wallet.createKeyringWithMnemonics(mnemonics).then(async () => {
        const keyring = await wallet.getKeyringByMnemonic(mnemonics);

        // const newAccounts = await Promise.all(
        //   accounts.map(async (account) => {
        //     const alianName = generateAliasName({
        //       keyringType: KEYRING_TYPE.HdKeyring,
        //       brandName: `${BRAND_ALIAN_TYPE_TEXT[KEYRING_TYPE.HdKeyring]}`,
        //       keyringCount: Math.max(keyring!.index, 0),
        //       addressCount: 0,
        //     });

        //     await wallet.updateAlianName(
        //       account?.address?.toLowerCase(),
        //       alianName
        //     );

        //     return {
        //       ...account,
        //       alianName,
        //     };
        //   })
        // );

        history.replace({
          pathname: '/popup/import/success',
          state: {
            // accounts: newAccounts,
            title: t('page.newAddress.seedPhrase.createdSuccessfully'),
            editing: true,
          },
        });

        dispatch.createMnemonics.reset();
      });
    },
    [mnemonics]
  );

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      formProps={{
        validateTrigger: 'onBlur',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
      onBackClick={() => {
        dispatch.createMnemonics.stepTo('display');
      }}
      noPadding
    >
      <header className="create-new-header create-mnemonics-header h-[80px] flex items-center justify-center flex-col padding-0">
        <h2 className="text-20 mb-0 mt-0 text-white text-center font-medium">
          {t('page.newAddress.seedPhrase.verifySeedPhrase')}
        </h2>
        <h3 className="text-14 mb-0 mt-4 text-white text-center font-normal">
          {t('page.newAddress.seedPhrase.fillInTheBackupSeedPhraseInOrder')}
        </h3>
      </header>
      <div className="rabby-container">
        <div className="pt-32 px-20">
          <Form.Item name="mnemonics">
            <TiledSelect
              options={randomMnemonics}
              errMsg={errMsg}
              correctValue={correctValue}
              onClear={() => setErrMsg('')}
            />
          </Form.Item>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(VerifyMnemonics);
