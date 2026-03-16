export const SELECT_ADDRESS_SOURCE_KEY = 'source';
export const SELECT_ADDRESS_HARDWARE_IMPORT_SOURCE = 'hardware-import';

export const withSelectAddressSource = (search: string, source: string) => {
  const query = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  );

  query.set(SELECT_ADDRESS_SOURCE_KEY, source);

  const nextSearch = query.toString();
  return nextSearch ? `?${nextSearch}` : '';
};

export const withHardwareImportSelectAddressSource = (search = '') =>
  withSelectAddressSource(search, SELECT_ADDRESS_HARDWARE_IMPORT_SOURCE);

export const isHardwareImportSelectAddress = (search: string) => {
  const query = new URLSearchParams(search);

  return (
    query.get(SELECT_ADDRESS_SOURCE_KEY) ===
    SELECT_ADDRESS_HARDWARE_IMPORT_SOURCE
  );
};
