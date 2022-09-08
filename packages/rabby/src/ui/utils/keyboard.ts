export function isTryingToPaste(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key === 'v' && (event.metaKey || event.ctrlKey)) {
    return true;
  }
}
