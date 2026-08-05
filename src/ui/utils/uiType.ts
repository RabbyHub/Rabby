const UI_TYPE = {
  Tab: 'index',
  Pop: 'popup',
  Notification: 'notification',
  Desktop: 'desktop',
};

type UiTypeCheck = {
  isTab: boolean;
  isNotification: boolean;
  isPop: boolean;
  isDesktop: boolean;
};

export const getUiType = (): UiTypeCheck => {
  const { pathname } = window.location;
  return Object.entries(UI_TYPE).reduce((result, [key, value]) => {
    result[`is${key}`] = pathname === `/${value}.html`;
    return result;
  }, {} as UiTypeCheck);
};

export const getUITypeName = (): string => {
  const uiType = getUiType();

  if (uiType.isPop) return 'popup';
  if (uiType.isNotification) return 'notification';
  if (uiType.isTab) return 'tab';
  if (uiType.isDesktop) return 'desktop';

  return '';
};
