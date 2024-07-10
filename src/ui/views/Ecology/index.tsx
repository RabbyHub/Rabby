import React from 'react';
import { useTranslation } from 'react-i18next';

import { useParams } from 'react-router-dom';
import { DbkChainEntry } from './dbk-chain/Entry';
import { EcologyNoticeModal } from '@/ui/component/Ecology/EcologyNoticeModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';

export const Ecology = () => {
  const { t } = useTranslation();

  const { chainId } = useParams<{ chainId: string }>();

  const isHideEcologyNotice = useRabbySelector(
    (state) => state.preference.isHideEcologyNotice
  );
  const [isShowNotice, setIsShowNotice] = React.useState(!isHideEcologyNotice);
  const dispatch = useRabbyDispatch();

  return (
    <>
      <DbkChainEntry />
      <EcologyNoticeModal
        visible={isShowNotice}
        onCancel={() => {
          setIsShowNotice(false);
        }}
        onConfirm={(v) => {
          if (v) {
            dispatch.preference.setIsHideEcologyNotice(v);
          }
          setIsShowNotice(false);
        }}
      />
    </>
  );
};
