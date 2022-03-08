import { DrawerProps, message, Switch } from 'antd';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { WidgetItem } from 'background/service/widget';
import IconSuccess from 'ui/assets/success.svg';
import IconWidget from 'ui/assets/dashboard/widget.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { Field, Popup, PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';

interface WidgetProps {
  visible?: boolean;
  onClose?: DrawerProps['onClose'];
}

const WidgetDetailModal = ({
  visible,
  widget,
  onFinish,
  onCancel,
}: {
  widget: WidgetItem | null;
  visible: boolean;
  onFinish(): void;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  const handleStatusChange = async (enable: boolean) => {
    console.log(widget, enable);
    if (!widget) return;
    if (enable) {
      await wallet.enableWidget(widget.name);
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Disable success'),
        duration: 0.5,
      });
    } else {
      await wallet.disableWidget(widget.name);
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Enable success'),
        duration: 0.5,
      });
    }
    setIsVisible(false);
    setTimeout(() => {
      onFinish();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  return (
    <div
      className={clsx('widget-detail-modal', {
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {widget?.name}
      </PageHeader>
      <div>
        <p className="widget-detail-desc mb-16">{widget?.description}</p>
        <p className="widget-detail-subtitle">
          This feature will insert content to the following websites:
        </p>
        <ul>
          {widget?.include.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
        <div className="flex justify-between mt-24 popup-footer">
          {widget?.disabled ? 'Disabled' : 'Enabled'}
          <Switch checked={!widget?.disabled} onChange={handleStatusChange} />
        </div>
      </div>
    </div>
  );
};

const Widget = ({ visible, onClose }: WidgetProps) => {
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [currentWidget, setCurrentWidget] = useState<WidgetItem | null>(null);
  const wallet = useWallet();
  const [showWidgetDetailModal, setShowWidgetDetailModal] = useState(false);

  const init = async () => {
    setWidgets(await wallet.getWidgets());
  };

  const handleClickWidget = (widget) => {
    setCurrentWidget(widget);
    setShowWidgetDetailModal(true);
  };

  const handleClose: DrawerProps['onClose'] = (e) => {
    setShowWidgetDetailModal(false);
    onClose && onClose(e);
  };

  const handleFinish = () => {
    init();
    setShowWidgetDetailModal(false);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <Popup
        visible={visible}
        onClose={handleClose}
        height={280}
        bodyStyle={{ height: '100%', padding: 0 }}
      >
        <div className="popup-widget">
          <div className="popup-widget__header">
            <div className="popup-widget__header-title">
              <img src={IconWidget} className="icon icon-widget" />
              Rabby Widget
            </div>
            <div className="popup-widget__header-desc">
              Preparing some magic features for you ...
            </div>
          </div>
          <div className="popup-widget__content">
            {widgets.map((data, index) => (
              <Field
                key={index}
                leftIcon={<img src={data.image} className="icon" />}
                rightIcon={
                  <div className="flex" onClick={() => handleClickWidget(data)}>
                    {data.disabled ? (
                      <span className="text-gray-comment mr-4 text-14">
                        Disabled
                      </span>
                    ) : (
                      <span className="text-blue-light mr-4 text-14">
                        Enabled
                      </span>
                    )}
                    <img
                      src={IconArrowRight}
                      className="icon icon-arrow-right"
                    />
                  </div>
                }
                onClick={() => handleClickWidget(data)}
              >
                {data.name}
              </Field>
            ))}
            <p className="coming-soon">More features coming soon</p>
          </div>
          <WidgetDetailModal
            visible={showWidgetDetailModal}
            widget={currentWidget}
            onFinish={handleFinish}
            onCancel={() => setShowWidgetDetailModal(false)}
          />
        </div>
      </Popup>
    </>
  );
};

export default Widget;
