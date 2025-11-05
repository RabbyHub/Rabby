import axios from 'axios';
import fetchAdapter from 'background/utils/fetchAdapter';

export const http = axios.create({
  adapter: fetchAdapter,
});
