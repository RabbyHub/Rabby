export const parseSignTypedDataMessage = (raw: string | object) => {
  let data: any = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }

  if (!data.primaryType) {
    return data.message;
  }

  const { primaryType, message, types } = data;
  return filterPrimaryType({ primaryType, types, message });
};

export const filterPrimaryType = ({
  primaryType,
  types,
  message,
}: {
  primaryType: string;
  types: Record<string, any>;
  message: Record<string, any>;
}) => {
  const keys = types[primaryType];
  const filteredMessage: Record<string, string> = {};

  if (!Array.isArray(keys)) {
    return message;
  }

  keys.forEach((key: { name: string; type: string }) => {
    filteredMessage[key.name] = message[key.name];
  });

  return filteredMessage;
};
