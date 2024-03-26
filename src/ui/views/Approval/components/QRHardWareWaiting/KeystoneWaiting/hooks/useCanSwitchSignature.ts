import { useEffect, useState } from 'react';
import { isSupported } from '@keystonehq/hw-transport-webusb';
import { useIsKeystoneUsbAvailable } from '@/ui/utils/keystone';
import { useCommonPopupView } from 'ui/utils';

export const useCanSwitchSignature = (brand) => {
  const [canSwitchSignature, setCanSwitchSignature] = useState(false);
  const { setHeight } = useCommonPopupView();
  const isKeystoneUsbAvailable = useIsKeystoneUsbAvailable(brand);

  useEffect(() => {
    const isKeystone = brand === 'Keystone';
    setCanSwitchSignature(isKeystone && isKeystoneUsbAvailable);
  }, [brand, isKeystoneUsbAvailable]);

  useEffect(() => {
    if (canSwitchSignature) {
      setHeight(400);
    }
  }, [canSwitchSignature]);

  return canSwitchSignature;
};
