export type KeyringSerializedDataLike<T = any> = {
  type: string;
  data: T;
};

export const sanitizeUnencryptedKeyringData = (
  item: KeyringSerializedDataLike,
  gridPlusKeyringType: string
): KeyringSerializedDataLike => {
  if (
    item.type !== gridPlusKeyringType ||
    !item.data ||
    typeof item.data !== 'object' ||
    Array.isArray(item.data)
  ) {
    return item;
  }

  if (!('creds' in item.data)) {
    return item;
  }

  const data = { ...(item.data as Record<string, unknown>) };
  delete data.creds;

  return {
    type: item.type,
    data,
  };
};
