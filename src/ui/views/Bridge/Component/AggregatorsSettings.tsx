import { Checkbox, Modal, Popup } from '@/ui/component';
import React, { useEffect, useState } from 'react';
import { useSetSettingVisible } from '../hooks';
import clsx from 'clsx';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCheck } from '@/ui/assets/dashboard/portfolio/cc-check.svg';
import { ReactComponent as RcIconChecked } from '@/ui/assets/dashboard/portfolio/cc-checked.svg';

import { useRabbyDispatch, useRabbyGetter, useRabbySelector } from '@/ui/store';
import { useHistory } from 'react-router-dom';

export const AggregatorsSettings = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useRabbyDispatch();

  const setVisible = useSetSettingVisible();

  const [forceGoHome, setForceGoHome] = useState(false);

  const aggregatorsList = useRabbySelector((s) => s.bridge.aggregatorsList);
  const aggregatorsListInit = useRabbySelector(
    (s) => s.bridge.aggregatorsListInit
  );
  const selectedAggregators = useRabbySelector(
    (s) => s.bridge.selectedAggregators || []
  );

  const [changedAggregator, setChangedAggregator] = useState(
    selectedAggregators
  );

  useEffect(() => {
    setChangedAggregator(selectedAggregators);
  }, [selectedAggregators]);

  useEffect(() => {
    if (aggregatorsListInit && aggregatorsList.length) {
      const availableAggregators = aggregatorsList.some((item) => {
        return selectedAggregators?.includes(item.id);
      });
      if (!availableAggregators) {
        setVisible(true);
        setForceGoHome(true);
      } else {
        setForceGoHome(false);
      }
    }
  }, [aggregatorsList, aggregatorsListInit, selectedAggregators]);

  const [open, setOpen] = useState(false);

  const onConfirm = async () => {
    if (changedAggregator.length) {
      await dispatch.bridge.setSelectedAggregators(changedAggregator);
      setOpen(false);
      onClose();
    }
  };

  return (
    <Popup
      visible={visible}
      title={
        <span className="text-[16px] font-medium text-r-neutral-title1">
          {t('page.bridge.settingModal.title')}
        </span>
      }
      height={400}
      onClose={
        forceGoHome
          ? () => {
              setVisible(false);
              history.replace('/dashboard');
            }
          : onClose
      }
      bodyStyle={{
        paddingTop: 16,
      }}
      isSupportDarkMode
      isNew
    >
      <div className="relative flex flex-col gap-16 h-full overflow-auto">
        {aggregatorsList?.map((item) => {
          const checked = !!changedAggregator?.includes(item.id);
          return (
            <div
              className="bg-r-neutral-card1 rounded-[6px] p-16 cursor-pointer"
              onClick={() => {
                setChangedAggregator((items) =>
                  items.includes(item.id)
                    ? items.filter((id) => id !== item.id)
                    : [...items, item.id]
                );
              }}
            >
              <div
                className={clsx(
                  'flex items-center justify-between',
                  'pb-[16px] mb-[13px] border-b border-solid border-rabby-neutral-line'
                )}
              >
                <div className="flex items-center justify-between gap-[7px]">
                  <img src={item.logo_url} className="w-24 h-24 rounded-full" />
                  <span className="text-16 font-medium text-r-neutral-title1">
                    {item.name}
                  </span>
                </div>

                <Checkbox
                  onChange={() => {
                    setChangedAggregator((items) =>
                      items.includes(item.id)
                        ? items.filter((id) => id !== item.id)
                        : [...items, item.id]
                    );
                  }}
                  checked={checked}
                  width="20px"
                  height="20px"
                  unCheckBackground="transparent"
                  checkIcon={
                    checked ? (
                      <RcIconChecked
                        viewBox="0 0 20 20"
                        className="text-r-blue-default"
                      />
                    ) : (
                      <RcIconCheck
                        viewBox="0 0 20 20"
                        className="text-r-neutral-foot"
                      />
                    )
                  }
                />
              </div>

              <div className="flex items-center gap-12 flex-wrap">
                <span>{t('page.bridge.settingModal.SupportedBridge')}</span>
                {item.bridge_list?.map((bridge) => {
                  return (
                    <Tooltip
                      overlayClassName="rectangle"
                      title={bridge.name}
                      key={bridge.name}
                    >
                      <img
                        src={bridge?.logo_url}
                        className="w-16 h-16 rounded-full"
                      />
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="min-h-[82px]" />
        <div className="fixed bottom-0 w-full ml-[-20px]  px-20 py-18 border-t-[0.5px] border-solid border-rabby-neutral-line bg-r-neutral-bg2">
          <Button
            onClick={() => setOpen(true)}
            type="primary"
            className="h-[44px] w-full text-[15px] font-medium text-r-neutral-title2"
            disabled={changedAggregator?.length === 0}
          >
            {t('page.bridge.settingModal.confirm')}
          </Button>
        </div>
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
          className="h-[40px] w-[188px] text-13 font-medium mx-auto"
          onClick={onConfirm}
        >
          {t('page.bridge.settingModal.confirm')}
        </Button>
      </div>
    </div>
  );
}
