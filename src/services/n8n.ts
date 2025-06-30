import axios from 'axios';

const baseURL = process.env.N8N_API_URL || 'http://localhost:5678';
const apiKey = process.env.N8N_API_KEY || '';

export const n8nClient = axios.create({
  baseURL,
  headers: { 'X-N8N-API-KEY': apiKey }
});

