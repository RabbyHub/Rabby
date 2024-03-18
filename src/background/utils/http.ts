import axios from 'axios';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';

export const http = axios.create({
  adapter: fetchAdapter,
});
