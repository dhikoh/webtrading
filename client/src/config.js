// Determine production API and WS base URLs dynamically from Vite environment or window origin
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Compute dynamic WS protocol based on API URL protocol
const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  // Fallback conversion of HTTP(S) API url to WS(S)
  const isHttps = API_URL.startsWith('https://');
  const cleanDomain = API_URL.replace('https://', '').replace('http://', '');
  return `${isHttps ? 'wss://' : 'ws://'}${cleanDomain}`;
};

export const WS_URL = getWsUrl();
