import React from 'react';
import Browser from 'webextension-polyfill';
import { useWallet } from '@/ui/utils';
import { CommonEntry } from './CommonEntry';
import { ResetConfirm } from './ResetConfirm';
import { PasswordCard } from '../NewUserImport/PasswordCard';
import { ResetTip } from './ResetTip';
import { useHistory } from 'react-router-dom';
import { ResetSuccess } from './ResetSuccess';
import { message } from 'antd';

export const ForgotPassword = () => {
  const history = useHistory();
  const wallet = useWallet();
  // seed phrase, private key, etc.
  const [hasEncryptedKeyringData, setHasEncryptedKeyringData] = React.useState(
    false
  );
  // hardware wallet, watch address, etc.
  const [
    hasUnencryptedKeyringData,
    setHasUnencryptedKeyringData,
  ] = React.useState(false);
  const [step, setStep] = React.useState<
    'entry' | 'reset-confirm' | 'reset-tip' | 'reset-password' | 'reset-success'
  >('entry');
  const [prevStep, setPrevStep] = React.useState(step);

  const handleSetStep = React.useCallback(
    (newStep: typeof step) => {
      setPrevStep(step);
      setStep(newStep);
    },
    [step]
  );

  const handleBack = React.useCallback(() => {
    handleSetStep(prevStep);
  }, [handleSetStep, prevStep]);
  const onEntryNext = React.useCallback(() => {
    if (hasEncryptedKeyringData) {
      handleSetStep('reset-confirm');
    } else {
      handleSetStep('reset-password');
    }
  }, [hasEncryptedKeyringData, handleSetStep]);
  const onResetConfirmNext = React.useCallback(async () => {
    // If there is no unencrypted keyring data, reset the booted status
    if (!hasUnencryptedKeyringData) {
      await wallet.resetBooted();
    }
    handleSetStep('reset-tip');
  }, [hasUnencryptedKeyringData, handleSetStep]);
  const onRestTipNext = React.useCallback(() => {
    if (hasUnencryptedKeyringData) {
      handleSetStep('reset-password');
    } else {
      wallet.tryOpenOrActiveUserGuide();
    }
  }, [handleSetStep, hasUnencryptedKeyringData]);
  const onPasswordSubmit = React.useCallback(
    async (password: string) => {
      try {
        await wallet.resetPassword(password);
        handleSetStep('reset-success');
      } catch (e) {
        message.error(e.message);
      }
    },
    [handleSetStep]
  );
  const onResultSuccessNext = React.useCallback(() => {
    window.close();
  }, []);

  // This useEffect is used to close the window when the extension icon is clicked
  React.useEffect(() => {
    wallet.tryOpenOrActiveUserGuide();
    const handleWindowClose = (request: any) => {
      if (request.type === 'pageOpened') {
        window.close();
      }
    };
    Browser.runtime.onMessage.addListener(handleWindowClose);

    return () => {
      Browser.runtime.onMessage.removeListener(handleWindowClose);
    };
  }, []);

  React.useEffect(() => {
    wallet.hasEncryptedKeyringData().then(setHasEncryptedKeyringData);
    wallet.hasUnencryptedKeyringData().then(setHasUnencryptedKeyringData);
  }, []);

  return (
    <>
      {step === 'entry' && (
        <CommonEntry hasStep={!hasEncryptedKeyringData} onNext={onEntryNext} />
      )}
      {step === 'reset-confirm' && (
        <ResetConfirm onBack={handleBack} onConfirm={onResetConfirmNext} />
      )}
      {step === 'reset-password' && (
        <PasswordCard
          step={2}
          onSubmit={onPasswordSubmit}
          onBack={handleBack}
        />
      )}
      {step === 'reset-tip' && (
        <ResetTip
          hasUnencryptedKeyringData={hasUnencryptedKeyringData}
          onNext={onRestTipNext}
        />
      )}
      {step === 'reset-success' && (
        <ResetSuccess onNext={onResultSuccessNext} />
      )}
    </>
  );
};
