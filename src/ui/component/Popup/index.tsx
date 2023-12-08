import { Drawer, DrawerProps } from 'antd';
import clsx from 'clsx';
import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import './index.less';
import { SvgIconCross } from 'ui/assets';
const closeIcon = (
  <SvgIconCross className="w-14 fill-current text-gray-content" />
);

interface PopupProps extends DrawerProps {
  onCancel?(): void;
  children?: ReactNode;
  isSupportDarkMode?: boolean;
}

const Popup = ({
  children,
  closable = false,
  placement = 'bottom',
  className,
  onClose,
  onCancel,
  isSupportDarkMode,
  ...rest
}: PopupProps) => (
  <Drawer
    onClose={onClose || onCancel}
    closable={closable}
    placement={placement}
    className={clsx(
      'custom-popup',
      isSupportDarkMode && 'is-support-darkmode',
      className
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

  function destroy() {
    ReactDOM.unmountComponentAtNode(container);
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
      ReactDOM.render(
        <Popup visible={false} onClose={handleCancel} {...props}>
          {content}
        </Popup>,
        container
      );
      if (visible) {
        setTimeout(() => {
          ReactDOM.render(
            <Popup visible={visible} onClose={handleCancel} {...props}>
              {content}
            </Popup>,
            container
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
