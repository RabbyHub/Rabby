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
