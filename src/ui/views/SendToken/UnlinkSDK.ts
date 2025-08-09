export type UnlinkConfig = Record<string, unknown>;

export type SendPrivateParams = {
  from: string;
  to: string;
  amount: number | string;
  chainId: number;
};

export class Unlink {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(config: UnlinkConfig) {}

  async sendPrivate(params: SendPrivateParams): Promise<{ ok: true }>;
  async sendPrivate(params: SendPrivateParams): Promise<{ ok: true }> {
    // Mocked implementation: simulate network delay
    await new Promise((r) => setTimeout(r, 500));
    if (!params.from || !params.to || !params.amount || !params.chainId) {
      throw new Error('Invalid Unlink params');
    }
    return { ok: true };
  }
}
