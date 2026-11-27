const userCancelledSigningErrors = new WeakSet<object>();

export const markUserCancelledSigningError = (error: object) => {
  userCancelledSigningErrors.add(error);
};

export const isUserCancelledSigningError = (error: unknown) =>
  error !== null &&
  typeof error === 'object' &&
  userCancelledSigningErrors.has(error);
