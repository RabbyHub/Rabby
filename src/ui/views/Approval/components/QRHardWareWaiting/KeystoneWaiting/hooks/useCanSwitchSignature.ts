import { useEffect, useState } from 'react';
import { isSupported } from '@keystonehq/hw-transport-webusb';
import { useCommonPopupView } from 'ui/utils';

export const useCanSwitchSignature = (brand) => {
  const [canSwitchSignature, setCanSwitchSignature] = useState(false);
  const { setHeight } = useCommonPopupView();

  const calcCanSwitchSignature = async () => {
    const isSupport = await isSupported().catch(() => false);
    setCanSwitchSignature(brand === 'Keystone' && isSupport);
  };
  useEffect(() => {
    calcCanSwitchSignature();
  }, [brand]);

  useEffect(() => {
    if (canSwitchSignature) {
      setHeight(400);
    }
  }, [canSwitchSignature]);

  return canSwitchSignature;
};
