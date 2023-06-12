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

export const appIsDev = process.env.NODE_ENV !== 'production';
