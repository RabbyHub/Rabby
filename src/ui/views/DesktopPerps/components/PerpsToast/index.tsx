import React from 'react';
import { message } from 'antd';
import clsx from 'clsx';
import { ReactComponent as IconSuccess } from '@/ui/assets/perps/toast-success.svg';
import { ReactComponent as IconError } from '@/ui/assets/perps/toast-error.svg';
import { ReactComponent as IconInfo } from '@/ui/assets/perps/toast-info.svg';
import { ReactComponent as IconClose } from '@/ui/assets/perps/toast-close.svg';
import './style.less';

export type PerpsToastType = 'success' | 'error' | 'info';

interface PerpsToastProps {
  type: PerpsToastType;
  title: string;
  description?: string;
  messageKey: string;
}

const ICON_MAP: Record<
  PerpsToastType,
  React.FC<React.SVGProps<SVGSVGElement>>
> = {
  success: IconSuccess,
  error: IconError,
  info: IconInfo,
};

const PerpsToastContent: React.FC<PerpsToastProps> = ({
  type,
  title,
  description,
  messageKey,
}) => {
  const Icon = ICON_MAP[type];

  const handleClose = () => {
    message.destroy(messageKey);
  };

  return (
    <div className={clsx('perps-toast-content', `perps-toast-${type}`)}>
      <div className="perps-toast-icon">
        <Icon />
      </div>
      <div className="perps-toast-body">
        <div className="perps-toast-title">{title}</div>
        {description && <div className="perps-toast-desc">{description}</div>}
      </div>
      <div className="perps-toast-close" onClick={handleClose}>
        <IconClose />
      </div>
    </div>
  );
};

interface ShowToastOptions {
  title: string;
  description?: string;
}

// Generate unique key for each toast
const generateKey = () => `perps-toast-${Date.now()}-${Math.random()}`;

/**
 * Show success toast - auto close after 2s
 */
export const showSuccessToast = ({ title, description }: ShowToastOptions) => {
  const key = generateKey();
  message.success({
    key,
    duration: 2,
    className: 'perps-toast-wrapper toast-right-bottom-wrapper',
    content: (
      <PerpsToastContent
        type="success"
        title={title}
        description={String(description)}
        messageKey={key}
      />
    ),
  });
  return key;
};

/**
 * Show error toast - auto close after 5s
 */
export const showErrorToast = ({ title, description }: ShowToastOptions) => {
  const key = generateKey();
  message.error({
    key,
    duration: 5,
    className: 'perps-toast-wrapper toast-right-bottom-wrapper',
    content: (
      <PerpsToastContent
        type="error"
        title={title}
        description={String(description)}
        messageKey={key}
      />
    ),
  });
  return key;
};

/**
 * Show info toast - auto close after 2s
 */
export const showInfoToast = ({ title, description }: ShowToastOptions) => {
  const key = generateKey();
  message.info({
    key,
    duration: 2,
    className: 'perps-toast-wrapper toast-right-bottom-wrapper',
    content: (
      <PerpsToastContent
        type="info"
        title={title}
        description={String(description)}
        messageKey={key}
      />
    ),
  });
  return key;
};

/**
 * Destroy a specific toast by key
 */
export const destroyToast = (key: string) => {
  message.destroy(key);
};

/**
 * Destroy all perps toasts
 */
export const destroyAllToasts = () => {
  message.destroy();
};

// Export a unified API
export const perpsToast = {
  success: showSuccessToast,
  error: showErrorToast,
  info: showInfoToast,
  destroy: destroyToast,
  destroyAll: destroyAllToasts,
};

export default perpsToast;
