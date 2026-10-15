export class CalldataDecodeError extends Error {
  constructor(public readonly step: string, message: string) {
    super(message);
    this.name = 'CalldataDecodeError';
  }
}

export const decodeAt = <T>(step: string, decode: () => T): T => {
  try {
    return decode();
  } catch (error) {
    if (error instanceof CalldataDecodeError) throw error;
    throw new CalldataDecodeError(
      step,
      error instanceof Error ? error.message : String(error)
    );
  }
};
