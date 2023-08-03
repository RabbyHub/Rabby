export const getSentryEnv = () => {
  let environment = 'production';

  if (process.env.DEBUG) {
    environment = 'debug';
  }

  if (process.env.NODE_ENV === 'development') {
    environment = 'development';
  }

  return environment;
};

export const appIsProd = process.env.NODE_ENV === 'production';
export const appIsDev = !appIsProd;
