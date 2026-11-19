import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { Popup, Checkbox } from 'ui/component';
import { Chain } from 'background/service/openapi';

const itemClassName =
  'item flex cursor-pointer justify-between items-center p-16 font-medium text-15 text-r-neutral-title1 relative border border-transparent rounded-[8px] bg-r-neutral-card1 hover:bg-r-blue-light-1 hover:border-r-blue-default';

interface Props {
  address: string;
  onWhitelist: boolean;
  onBlacklist: boolean;
  onChange({
    onWhitelist,
    onBlacklist,
  }: {
    onWhitelist: boolean;
    onBlacklist: boolean;
  }): void;
}

const UserListDrawer = ({
  address,
  onWhitelist,
  onBlacklist,
  onChange,
}: Props) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col gap-12">
        <div
          className={itemClassName}
          onClick={() => onChange({ onBlacklist: false, onWhitelist: false })}
        >
          <div>{t('page.signTx.noMark')}</div>
          <div>
            <Checkbox
              width="20px"
              height="20px"
              checked={!onWhitelist && !onBlacklist}
              onChange={() =>
                onChange({ onBlacklist: false, onWhitelist: false })
              }
            />
          </div>
        </div>
        <div
          className={itemClassName}
          onClick={() => onChange({ onBlacklist: false, onWhitelist: true })}
        >
          <div className="text-green">{t('page.signTx.trusted')}</div>
          <div>
            <Checkbox
              width="20px"
              height="20px"
              checked={onWhitelist}
              onChange={() =>
                onChange({ onBlacklist: false, onWhitelist: true })
              }
            />
          </div>
        </div>
        <div
          className={itemClassName}
          onClick={() => onChange({ onBlacklist: true, onWhitelist: false })}
        >
          <div className="text-red">{t('page.signTx.blocked')}</div>
          <div>
            <Checkbox
              width="20px"
              height="20px"
              checked={onBlacklist}
              onChange={() =>
                onChange({ onBlacklist: true, onWhitelist: false })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ({
  address,
  chain,
  onWhitelist,
  onBlacklist,
  onChange,
}: {
  address: string;
  chain?: Chain;
  onWhitelist: boolean;
  onBlacklist: boolean;
  onChange({
    onWhitelist,
    onBlacklist,
  }: {
    onWhitelist: boolean;
    onBlacklist: boolean;
  }): void;
}) => {
  const { destroy } = Popup.info({
    bodyStyle: {
      padding: '16px 20px 0',
    },
    isNew: true,
    content: (
      <UserListDrawer
        address={address}
        onWhitelist={onWhitelist}
        onBlacklist={onBlacklist}
        onChange={(res) => {
          onChange(res);
          destroy();
        }}
      />
    ),
    height: 260,
    closable: true,
    title: i18n.t('page.signTx.myMarkWithContract', {
      chainName: chain?.name,
    }),
    className: 'user-list-drawer',
    onClose: () => destroy(),
    onCancel: () => destroy(),
  });
};
