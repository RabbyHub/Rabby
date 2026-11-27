import { toChecksumAddress } from '@ethereumjs/util';
import { message } from 'antd';
import { t } from 'i18next';
import React from 'react';
import IconSuccess from 'ui/assets/success.svg';

// For contexts without `navigator.clipboard`. Writes through a `copy` event
// instead of selecting a textarea, so an empty string really clears the
// clipboard: `execCommand('copy')` on an empty selection copies nothing and
// still returns true.
function fallbackCopyTextToClipboard(text: string) {
  let written = false;
  const onCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) {
      return;
    }
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
    written = true;
  };

  document.addEventListener('copy', onCopy, true);
  try {
    return document.execCommand('copy') && written;
  } catch (err) {
    console.error('[fallbackCopyTextToClipboard] unable to copy', err);
    return false;
  } finally {
    document.removeEventListener('copy', onCopy, true);
  }
}

/**
 * Resolves to whether `text` reached the clipboard; never rejects. Show a
 * "copied" toast only when it resolves to true. `writeText` fails when the
 * document is not focused (e.g. after an `await` once the user switched
 * windows), and in Firefox outside a user gesture.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return fallbackCopyTextToClipboard(text);
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('[copyTextToClipboard] unable to copy', err);
    return false;
  }
}

export async function copyAddress(address: string): Promise<boolean> {
  let checksumAddress: string;
  try {
    checksumAddress = toChecksumAddress(address);
  } catch (err) {
    console.error('[copyAddress] not a hex address', err);
    return false;
  }
  if (!(await copyTextToClipboard(checksumAddress))) {
    return false;
  }
  const duration = 3;
  const destroy = message.success({
    duration,
    icon: <i />,
    content: (
      <div>
        <div className="flex gap-4 mb-4">
          <img src={IconSuccess} alt="" />
          {t('global.copied')}
        </div>
        <div className="text-white">{checksumAddress}</div>
      </div>
    ),
  });
  setTimeout(() => {
    destroy();
  }, duration * 1000);
  return true;
}

/**
 * Overwrites the clipboard after a private key or seed phrase was pasted.
 * Resolves to false when the clipboard may still hold the secret; callers
 * must not claim it was cleared in that case.
 */
export const clearClipboard = () => copyTextToClipboard('');
