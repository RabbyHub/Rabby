import { Checkbox, Modal, Popup } from '@/ui/component';
import React, { useEffect, useState } from 'react';
import { useSetSettingVisible } from '../hooks';
import clsx from 'clsx';
import { Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

export const AggregatorsSettings = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();

  const setVisible = useSetSettingVisible();

  const dispatch = useRabbyDispatch();

  const aggregatorsList = useRabbySelector((s) => s.bridge.aggregatorsList);

  const aggregatorsListInit = useRabbySelector(
    (s) => s.bridge.aggregatorsListInit
  );
  const selectedAggregators = useRabbySelector(
    (s) => s.bridge.selectedAggregators || []
  );
  const aggregatorsSettingFirstOpen = useRabbySelector(
    (s) => s.bridge.firstOpen ?? true
  );
  const [willChangedAggregatorId, setSillChangedAggregatorId] = useState('');

  const [open, setOpen] = useState(false);

  const onConfirm = async () => {
    if (willChangedAggregatorId) {
      const changedItems = selectedAggregators.includes(willChangedAggregatorId)
        ? selectedAggregators.filter((id) => id !== willChangedAggregatorId)
        : [...selectedAggregators, willChangedAggregatorId];

      dispatch.bridge.setSelectedAggregators(changedItems);
      setOpen(false);
    }
  };

  useEffect(() => {
    if (aggregatorsListInit && aggregatorsList.length) {
      const availableAggregators = aggregatorsList.some((item) => {
        return selectedAggregators?.includes(item.id);
      });
      if (!availableAggregators && aggregatorsSettingFirstOpen) {
        setVisible(true);
        dispatch.bridge.setBridgeSettingFirstOpen(false);
      }
      dispatch.bridge.setBridgeSettingFirstOpen(false);
    }
  }, [
    aggregatorsList,
    aggregatorsListInit,
    selectedAggregators,
    aggregatorsSettingFirstOpen,
  ]);

  return (
    <Popup
      visible={visible}
      title={
        <span className="text-[17px] font-medium text-r-neutral-title1 relative -top-2">
          {t('page.bridge.settingModal.title')}
        </span>
      }
      height={412}
      onClose={onClose}
      bodyStyle={{
        paddingTop: 16,
      }}
      isSupportDarkMode
      isNew
    >
      <div className="relative flex flex-col gap-16 h-full overflow-auto">
        {aggregatorsList?.map((item) => {
          const checked = !!selectedAggregators?.includes(item.id);

          const switchChecked = () => {
            if (!checked) {
              setSillChangedAggregatorId(item.id);
              setOpen(true);
            }
            dispatch.bridge.setSelectedAggregators(
              selectedAggregators.filter((id) => id !== item.id)
            );
          };

          return (
            <div
              key={item.id}
              className="bg-r-neutral-card1 rounded-[6px] p-16 cursor-pointer border border-transparent hover:border-rabby-blue-default"
              onClick={switchChecked}
            >
              <div
                className={clsx(
                  'flex items-center justify-between',
                  'pb-[16px] mb-[13px] border-b-[0.5px] border-solid border-rabby-neutral-line'
                )}
              >
                <div className="flex items-center justify-between gap-[7px]">
                  <img src={item.logo_url} className="w-24 h-24 rounded-full" />
                  <span className="text-[16px] font-medium text-r-neutral-title1">
                    {item.name}
                  </span>
                </div>

                <Switch checked={checked} onChange={switchChecked} />
              </div>

              <div className="flex items-center gap-12 flex-wrap relative">
                <span className="text-12 text-rabby-neutral-foot">
                  {t('page.bridge.settingModal.SupportedBridge')}
                </span>
                {item.bridge_list?.map((bridge) => {
                  return (
                    <TooltipWithMagnetArrow
                      overlayClassName="rectangle w-[max-content]"
                      title={`${bridge.name} Bridge`}
                      key={bridge.name}
                      arrowPointAtCenter
                    >
                      <img
                        src={bridge?.logo_url}
                        className="w-16 h-16 rounded-full"
                      />
                    </TooltipWithMagnetArrow>
                  );
                })}
              </div>
            </div>
          );
        })}

        <Button
          block
          type="primary"
          size="large"
          onClick={onClose}
          className="mt-auto h-[48px]"
        >
          {t('global.Done')}
        </Button>
      </div>
      <Modal
        bodyStyle={{
          background: 'var(--r-neutral-bg-1, #3D4251)',
          height: 280,
        }}
        // center
        visible={open}
        title={null}
        footer={null}
        destroyOnClose
        onCancel={async () => {
          setOpen(false);
        }}
      >
        <EnableTrading onConfirm={onConfirm} />
      </Modal>
    </Popup>
  );
};

function EnableTrading({ onConfirm }: { onConfirm: () => void }) {
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();
  return (
    <div>
      <div className="relative my-12 text-[16px] font-medium text-center text-r-neutral-title-1">
        {t('page.bridge.settingModal.confirmModal.title')}
      </div>
      <div className="text-13 leading-[18px] text-r-neutral-body">
        <p>{t('page.bridge.settingModal.confirmModal.tip1')}</p>
        <p>{t('page.bridge.settingModal.confirmModal.tip2')}</p>
      </div>
      <div className="flex flex-col justify-center items-center gap-16 text-r-neutral-body mt-[30px]">
        <Checkbox checked={checked} onChange={setChecked}>
          {t(
            'page.bridge.settingModal.confirmModal.i-understand-and-accept-it'
          )}
        </Checkbox>

        <Button
          type="primary"
          block
          disabled={!checked}
          className="h-[40px] text-13 font-medium mx-auto"
          onClick={onConfirm}
        >
          {t('page.bridge.settingModal.confirm')}
        </Button>
      </div>
    </div>
  );
}
