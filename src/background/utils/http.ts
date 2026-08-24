import axios from 'axios';
import fetchAdapter from '@/services/openapi/fetchAdapter';

export const http = axios.create({
  adapter: fetchAdapter,
});
