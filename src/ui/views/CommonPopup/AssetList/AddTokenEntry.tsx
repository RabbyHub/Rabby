import React, { useImperativeHandle } from 'react';

import { ReactComponent as RcAddEntryCC } from './icons/add-entry-cc.svg';
import { ReactComponent as RcIconAdd } from '@/ui/assets/dashboard/portfolio/cc-add.svg';
import clsx from 'clsx';
import { AddCustomTokenPopup } from './CustomAssetList/AddCustomTokenPopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { useTranslation } from 'react-i18next';
import { SpecialTokenListPopup } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';

type Props = {
  onConfirm?: React.ComponentProps<typeof AddCustomTokenPopup>['onConfirm'];
};
export type AddTokenEntryInst = {
  startAddToken: () => void;
};
const AddTokenEntry = React.forwardRef<AddTokenEntryInst, Props>(
  function AddTokenEntryPorto({ onConfirm }, ref) {
    const { t } = useTranslation();
    const [isShowAddModal, setIsShowAddModal] = React.useState<boolean>(false);

    useImperativeHandle(ref, () => ({
      startAddToken: () => {
        setIsShowAddModal(true);
      },
    }));

    // const [focusingToken, setFocusingToken] = React.useState<TokenItem | null>(
    //   null
    // );

    const { customize } = useRabbySelector((store) => store.account.tokens);
    const tokens = useSortToken(customize);

    const [showCustomizedTokens, setShowCustomizedTokens] = React.useState(
      false
    );

    return (
      <>
        <div
          className={clsx(
            'flex flex-row justify-start items-center',
            'border-[1px] border-transparent',
            'hover:border-rabby-blue-default hover:bg-r-blue-light1',
            'h-[32px] px-[14px] py-[8px] bg-r-neutral-card2 rounded-[6px] cursor-pointer',
            'text-r-neutral-body text-[13px] text-center',
            'whitespace-nowrap'
          )}
          onClick={() => {
            setIsShowAddModal(true);
          }}
        >
          <div className="text-[13px] leading-[16px] flex items-center gap-x-[4px] justify-center">
            <span className="text-r-neutral-body">
              <RcIconAdd className="w-[14px] h-[14px]" />
            </span>
            {t('page.dashboard.assets.addTokenEntryText')}
          </div>
        </div>

        <AddCustomTokenPopup
          visible={isShowAddModal}
          onClose={() => {
            setIsShowAddModal(false);
          }}
          onConfirm={(addedToken) => {
            setIsShowAddModal(false);
            setShowCustomizedTokens(true);

            // setFocusingToken(addedToken?.token || null);
            // refreshAsync();
          }}
        />

        {/* <TokenDetailPopup
          variant="add"
          token={focusingToken}
          visible={!!focusingToken}
          onClose={() => setFocusingToken(null)}
        /> */}

        <SpecialTokenListPopup
          label={t('page.dashboard.tokenDetail.customizedButton')}
          buttonText={t('page.dashboard.assets.customButtonText')}
          description={t('page.dashboard.assets.customDescription')}
          onClickButton={() => {
            setShowCustomizedTokens(true);
          }}
          tokens={tokens}
          visible={showCustomizedTokens}
          onClose={() => setShowCustomizedTokens(false)}
        />
      </>
    );
  }
);

export default AddTokenEntry;
