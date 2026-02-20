const ROLE_FIELDS = ['suspects', 'victim', 'guilty_name'];

const normalizeName = (value) => (value === null || value === undefined ? '' : String(value).trim());

const normalizeAge = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 120) return null;
  return num;
};

const normalizePersonEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const name = normalizeName(entry.name);
  if (!name) return null;
  return {
    name,
    age: normalizeAge(entry.age),
  };
};

const parseLegacyPeopleString = (value) => {
  const text = normalizeName(value);
  if (!text || text.toUpperCase() === 'N/A') return [];

  const namedWithAge = [];
  const re = /Name:\s*([^,]+?)\s+Age:\s*(\d{1,3})/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const name = normalizeName(match[1]);
    const age = normalizeAge(match[2]);
    if (name) namedWithAge.push({ name, age });
  }
  if (namedWithAge.length) return namedWithAge;

  return text
    .split(',')
    .map((part) => normalizeName(part))
    .filter(Boolean)
    .map((name) => ({ name, age: null }));
};

const normalizePeopleField = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizePersonEntry).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const one = normalizePersonEntry(value);
    return one ? [one] : [];
  }

  if (typeof value === 'string') {
    return parseLegacyPeopleString(value);
  }

  return [];
};

const normalizeCasePeoplePayload = (payload = {}) => {
  const normalized = { ...payload };
  for (const field of ROLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      normalized[field] = normalizePeopleField(payload[field]);
    }
  }
  return normalized;
};

const formatPeopleField = (value) => {
  const arr = normalizePeopleField(value);
  if (!arr.length) return 'N/A';
  return arr
    .map((p) => (p.age === null || p.age === undefined ? `Name: ${p.name}` : `Name: ${p.name}   Age: ${p.age}`))
    .join(', ');
};

const serializeCaseForClient = (caseDoc) => {
  const obj = caseDoc && typeof caseDoc.toObject === 'function' ? caseDoc.toObject() : { ...caseDoc };
  for (const field of ROLE_FIELDS) {
    obj[field] = formatPeopleField(obj[field]);
  }
  return obj;
};

const serializeCasesForClient = (caseDocs = []) => caseDocs.map(serializeCaseForClient);

const buildPeopleSearchOr = (field, query) => {
  const regex = { $regex: query, $options: 'i' };
  return [{ [`${field}.name`]: regex }];
};

const buildPeopleForAllSearchOr = (query) => {
  const regex = { $regex: query, $options: 'i' };
  return [
    { 'suspects.name': regex },
    { 'victim.name': regex },
    { 'guilty_name.name': regex },
  ];
};

module.exports = {
  ROLE_FIELDS,
  normalizePeopleField,
  normalizeCasePeoplePayload,
  formatPeopleField,
  serializeCaseForClient,
  serializeCasesForClient,
  buildPeopleSearchOr,
  buildPeopleForAllSearchOr,
};
