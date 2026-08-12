import openapiService from '@/background/service/openapi';

type GasAccountInfoV2Params = Parameters<
  typeof openapiService.getGasAccountInfoV2
>[0];

const inFlightRequests = new Map<
  string,
  ReturnType<typeof openapiService.getGasAccountInfoV2>
>();

export const getGasAccountInfoV2InFlight = (params: GasAccountInfoV2Params) => {
  const key = params.id.toLowerCase();
  const existing = inFlightRequests.get(key);
  if (existing) {
    return existing;
  }

  const request = openapiService
    .getGasAccountInfoV2(params)
    .finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, request);
  return request;
};
