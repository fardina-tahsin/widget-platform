const env = require('../config/env');
const { normalizeIp, isPrivateIp } = require('../lib/ip');

const MOCK_GEO = {
  country: 'Testland',
  countryCode: 'TL',
  city: 'Testville',
  lat: 1.23,
  lon: 4.56,
};

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function queryProviderA(ip) {
  const base = env.geo.providerAUrl.replace(/\/$/, '');
  const data = await fetchJson(
    `${base}/${encodeURIComponent(ip)}?fields=status,country,countryCode,city,lat,lon`,
    env.geo.timeoutMs,
  );
  if (!data || data.status !== 'success') return null;
  return {
    provider: 'ip-api',
    country: data.country,
    countryCode: data.countryCode,
    city: data.city,
    lat: data.lat,
    lon: data.lon,
  };
}

async function queryProviderB(ip) {
  const base = env.geo.providerBUrl.replace(/\/$/, '');
  const data = await fetchJson(`${base}/${encodeURIComponent(ip)}/json/`, env.geo.timeoutMs);
  if (!data || data.error) return null;
  return {
    provider: 'ipapi',
    country: data.country_name,
    countryCode: data.country_code,
    city: data.city,
    lat: data.latitude,
    lon: data.longitude,
  };
}

async function mockProvider(name) {
  if ((name === 'a' ? env.geo.mockA : env.geo.mockB) === 'down') {
    throw new Error(`mock geo provider ${name.toUpperCase()} is down`);
  }
  return { ...MOCK_GEO, provider: `mock-${name}` };
}

async function lookup(ip) {
  const normalized = normalizeIp(ip);
  const mock = env.geo.mode === 'mock';
  if (!mock && (!normalized || isPrivateIp(normalized))) return null;

  const providers = mock
    ? [() => mockProvider('a'), () => mockProvider('b')]
    : [() => queryProviderA(normalized), () => queryProviderB(normalized)];

  for (const provider of providers) {
    try {
      const geo = await provider();
      if (geo) return geo;
    } catch (err) {
      console.warn(`geo provider failed: ${err.message}`);
    }
  }
  return null;
}

module.exports = { lookup };
