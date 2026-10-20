function validateSubmissionFields(fieldDefs, values) {
  const details = [];
  const payload = {};
  const defs = Array.isArray(fieldDefs) ? fieldDefs : [];

  for (const def of defs) {
    const raw = values[def.name];
    const missing = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
    if (missing) {
      if (def.required) details.push({ field: def.name, message: 'is required' });
      continue;
    }
    if (typeof raw !== 'string') {
      details.push({ field: def.name, message: 'must be a string' });
      continue;
    }
    const value = raw.trim();
    const max = def.maxLength ?? (def.type === 'textarea' ? 2000 : 500);
    if (value.length > max) {
      details.push({ field: def.name, message: `must be at most ${max} characters` });
      continue;
    }
    if (def.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      details.push({ field: def.name, message: 'must be a valid email' });
      continue;
    }
    if (def.type === 'number' && !/^-?\d+(\.\d+)?$/.test(value)) {
      details.push({ field: def.name, message: 'must be a number' });
      continue;
    }
    payload[def.name] = value;
  }

  for (const key of Object.keys(values)) {
    if (key === 'hp') continue;
    if (!defs.some((def) => def.name === key)) {
      details.push({ field: key, message: 'is not a field of this widget' });
    }
  }

  return details.length ? { ok: false, details } : { ok: true, payload };
}

module.exports = { validateSubmissionFields };
