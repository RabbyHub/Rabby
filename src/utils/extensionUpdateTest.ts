import { appIsDev } from './env';

// TEMP: local update-flow testing only. Never allow localhost in production.
export const LOCAL_UPDATE_TEST_ORIGIN = 'http://localhost:5173';
export const MOCK_PENDING_VERSION = '0.94.8';
export const isLocalUpdateTest = () => appIsDev;
