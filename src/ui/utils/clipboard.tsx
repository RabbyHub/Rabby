import { message } from 'antd';
import { t } from 'i18next';
import React from 'react';
import IconSuccess from 'ui/assets/success.svg';
function fallbackCopyTextToClipboard(text: string) {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    const msg = successful ? 'successful' : 'unsuccessful';
    console.log(
      '[fallbackCopyTextToClipboard] Copying text command was ' + msg
    );
  } catch (err) {
    console.error('[fallbackCopyTextToClipboard] Oops, unable to copy', err);
  }

  document.body.removeChild(textArea);
}

export async function copyTextToClipboard(text: string) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  return navigator.clipboard.writeText(text);
}

export async function copyAddress(address: string) {
  await copyTextToClipboard(address);
  message.success({
    duration: 3,
    icon: <i />,
    content: (
      <div>
        <div className="flex gap-4 mb-4">
          <img src={IconSuccess} alt="" />
          {t('global.copied')}
        </div>
        <div className="text-white">{address}</div>
      </div>
    ),
  });
}

export const clearClipboard = async () => {
  await copyTextToClipboard('');
};
