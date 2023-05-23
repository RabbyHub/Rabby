export const parseSignTypedDataMessage = (raw: string) => {
  const data = JSON.parse(raw);

  if (!data.primaryType) {
    return data.message;
  }

  const { primaryType, message, types } = data;
  const keys = types[primaryType];
  const filteredMessage: Record<string, string> = {};

  keys.forEach((key: { name: string; type: string }) => {
    filteredMessage[key.name] = message[key.name];
  });

  return filteredMessage;
};
