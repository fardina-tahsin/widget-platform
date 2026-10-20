function normalizeIp(ip) {
  if (!ip) return '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function isPrivateIp(ip) {
  const value = normalizeIp(ip);
  if (!value) return true;
  if (value === '::1' || value === '::') return true;
  if (value.startsWith('127.') || value.startsWith('10.') || value.startsWith('192.168.')) return true;
  if (value.startsWith('169.254.')) return true;
  if (value.startsWith('172.')) {
    const second = Number(value.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  const lower = value.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) return true;
  return false;
}

module.exports = { normalizeIp, isPrivateIp };
