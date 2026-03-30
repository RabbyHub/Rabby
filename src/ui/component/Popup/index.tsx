import { Drawer, DrawerProps } from 'antd';
import clsx from 'clsx';
import React, { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.less';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

const closeIcon = (
  <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
);

export interface PopupProps extends DrawerProps {
  onCancel?(): void;
  children?: ReactNode;
  isSupportDarkMode?: boolean;
  isNew?: boolean;
  isLoading?: boolean;
}

const Popup = ({
  children,
  closable = false,
  placement = 'bottom',
  className,
  onClose,
  onCancel,
  isSupportDarkMode,
  isNew,
  ...rest
}: PopupProps) => (
  <Drawer
    onClose={onClose || onCancel}
    closable={closable}
    placement={placement}
    className={clsx(
      'custom-popup',
      isSupportDarkMode && 'is-support-darkmode',
      className,
      {
        'is-new': isNew,
      }
    )}
    destroyOnClose
    closeIcon={closeIcon}
    {...rest}
  >
    {children}
  </Drawer>
);

const open = (
  config: PopupProps & {
    content?: ReactNode;
  }
) => {
  const container = document.createDocumentFragment();
  const root = createRoot(container);

  function destroy() {
    root.unmount();
  }

  function render({
    visible = true,
    content,
    onClose,
    onCancel,
    ...props
  }: any) {
    setTimeout(() => {
      const handleCancel = () => {
        close && close();
        onClose && onClose();
        onCancel && onCancel();
      };
      root.render(
        <Popup visible={false} onClose={handleCancel} {...props}>
          {content}
        </Popup>
      );
      if (visible) {
        setTimeout(() => {
          root.render(
            <Popup visible={visible} onClose={handleCancel} {...props}>
              {content}
            </Popup>
          );
        });
      }
    });
  }

  function close() {
    render({
      visible: false,
      afterVisibleChange: (v) => {
        if (!v) {
          destroy();
        }
      },
    });
  }

  render(config);
  return {
    destroy: close,
  };
};

Popup.open = Popup.info = open;

export default Popup;
