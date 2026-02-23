const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/';
const PROD_MONGO_URI =
  'mongodb+srv://pritchotaliya206gmailcom:123123123@cluster0.ylfbtmd.mongodb.net/?appName=Cluster0';
const MONGO_URI = isProduction ? PROD_MONGO_URI : LOCAL_MONGO_URI;
const MONGO_DB = 'police_info';
const DEFAULT_TARGETS = {
  users: 20,
  cases: 50,
  updatecases: 25,
  reports: 20,
};
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$/;

const GIVEN_NAMES = [
  'Aarav',
  'Aditi',
  'Akash',
  'Ananya',
  'Bhavesh',
  'Deepa',
  'Dhruv',
  'Farhan',
  'Gaurav',
  'Harsh',
  'Isha',
  'Jatin',
  'Karan',
  'Meera',
  'Nirav',
  'Pooja',
  'Rahul',
  'Rina',
  'Sahil',
  'Tanya',
  'Umang',
  'Varun',
  'Yash',
  'Zoya',
];

const FAMILY_NAMES = [
  'Patel',
  'Shah',
  'Mehta',
  'Desai',
  'Rana',
  'Solanki',
  'Raval',
  'Chauhan',
  'Trivedi',
  'Khan',
  'Mistry',
  'Parmar',
  'Vora',
  'Pandya',
  'Modi',
  'Joshi',
];

const LOCALITY_TAGS = [
  'Sector 5',
  'Old City',
  'Ring Road',
  'Railway Colony',
  'Civil Lines',
  'Market Yard',
  'Harbor Zone',
  'Industrial Estate',
  'University Area',
  'BRTS Corridor',
  'Town Hall Ward',
  'Lakefront Belt',
  'Court Circle',
  'Bus Depot Zone',
  'Mill Compound',
];

const CASE_TITLE_CONTEXT = [
  'Extension',
  'Night Shift',
  'South Beat',
  'Station Diary',
  'Reopened File',
  'Patrol Note',
  'Cross District Link',
  'Evidence Link',
];

const CASE_NOTE_LINES = [
  'Fresh witness statements were recorded and attached to the case diary.',
  'CCTV timeline was matched with call-detail records for suspect movement mapping.',
  'Forensic lab remarks were received and added to the investigation file.',
  'Patrol logs from nearby beats were reconciled with the incident timeline.',
  'Additional digital evidence was tagged and sent for technical review.',
  'The complainant provided supplementary material evidence for verification.',
  'Scene sketch and recovery memo were updated after field reinspection.',
  'Suspect movement notes were cross-checked with transport and toll records.',
];

const UPDATE_TITLE_SUFFIXES = [
  'Supplementary Statement',
  'Forensic Clarification',
  'Witness Revision',
  'Charge Update',
  'Evidence Addendum',
  'Case Diary Correction',
  'Timeline Reconciliation',
  'Follow Up Note',
];

const UPDATE_NOTE_LINES = [
  'Case diary entries were corrected after verification of witness chronology.',
  'Forensic references were updated with latest lab observations.',
  'New statement excerpts were added and contradictory portions were marked.',
  'Recovered material details were revised in the property register.',
  'Officer remarks were aligned with station movement records.',
  'Digital trail references were expanded after technical verification.',
  'Timeline mismatch points were resolved after reviewing control room logs.',
  'Supporting annexures were reattached in corrected order for review.',
];

const UPDATE_CHANGE_ITEMS = [
  'Corrected witness chronology in the case diary',
  'Added forensic lab observation summary',
  'Updated suspect movement timeline',
  'Attached supplementary witness statement',
  'Revised property recovery memo details',
  'Aligned officer remarks with station logbook',
  'Added digital evidence verification note',
  'Reconciled call-detail record references',
  'Updated scene reinspection findings',
  'Clarified annexure sequence for legal review',
  'Corrected section references in update note',
  'Added follow-up patrol log references',
];

const REPORT_SUBJECTS = [
  'Street lighting outage',
  'Repeated late-night bike racing',
  'Suspicious loitering near ATM kiosks',
  'Noise complaints from illegal gathering',
  'Frequent chain-snatching attempt alerts',
  'Unverified cyber fraud calls',
  'Public parking extortion complaint',
  'Traffic signal blackout',
  'Unauthorized betting activity',
  'Patrol vehicle maintenance issue',
];

const REPORT_DETAILS = [
  'Residents reported repeated disturbances over the last two weeks.',
  'Local shopkeepers shared timestamps and nearby camera pointers.',
  'Beat staff observed similar incidents across consecutive weekends.',
  'Complainants requested immediate preventive rounds during peak hours.',
  'Concerned citizens flagged this through resident welfare groups.',
  'Multiple callers described the same pattern from different lanes.',
  'Nearby businesses reported fear and early closure because of the issue.',
  'The matter was escalated after two near-miss incidents.',
];

const REPORT_REQUESTS = [
  'Please assign regular patrolling in this stretch.',
  'Kindly verify cameras and increase surveillance coverage.',
  'Requesting urgent intervention before weekend crowd movement.',
  'Need a follow-up call from the control room for updates.',
  'Please mark this for immediate field verification.',
];

function loadSeedDataFromMongoshScript() {
  const captured = {
    users: [],
    cases: [],
    updatecases: [],
    reports: [],
  };

  const buildCollectionShim = (name) => ({
    deleteMany() {
      captured[name] = [];
      return { acknowledged: true, deletedCount: 0 };
    },
    insertMany(docs) {
      const safeDocs = Array.isArray(docs) ? docs : [];
      captured[name] = safeDocs;
      const insertedIds = {};
      safeDocs.forEach((_, index) => {
        insertedIds[index] = new mongoose.Types.ObjectId();
      });
      return {
        acknowledged: true,
        insertedCount: safeDocs.length,
        insertedIds,
      };
    },
  });

  const dbShim = {
    getSiblingDB() {
      return new Proxy(
        {},
        {
          get(_, prop) {
            return buildCollectionShim(String(prop));
          },
        }
      );
    },
  };

  const sourcePath = path.join(__dirname, 'seed-feature-data.mongosh.js');
  const source = fs.readFileSync(sourcePath, 'utf8');

  const context = {
    db: dbShim,
    ObjectId: (id) => new mongoose.Types.ObjectId(id),
    print: () => {},
    printjson: () => {},
    Date,
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: sourcePath });

  return captured;
}

function parseCountArg(flagName, fallback) {
  const eqPrefix = `--${flagName}=`;
  const eqArg = process.argv.find((arg) => arg.startsWith(eqPrefix));
  let rawValue = null;

  if (eqArg) {
    rawValue = eqArg.slice(eqPrefix.length);
  } else {
    const spacedIndex = process.argv.indexOf(`--${flagName}`);
    if (spacedIndex !== -1 && process.argv[spacedIndex + 1]) {
      rawValue = process.argv[spacedIndex + 1];
    }
  }

  if (rawValue === null || rawValue === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid --${flagName} value "${rawValue}". Use a positive integer.`);
  }
  return parsed;
}

function readTargetsFromArgs() {
  return {
    users: parseCountArg('users', DEFAULT_TARGETS.users),
    cases: parseCountArg('cases', DEFAULT_TARGETS.cases),
    updatecases: parseCountArg('updates', DEFAULT_TARGETS.updatecases),
    reports: parseCountArg('reports', DEFAULT_TARGETS.reports),
  };
}

function deepClone(value) {
  if (value && typeof value === 'object') {
    const bsonType = value._bsontype;
    if (bsonType === 'ObjectID' || bsonType === 'ObjectId') {
      return new mongoose.Types.ObjectId(String(value));
    }
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return new mongoose.Types.ObjectId(String(value));
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }

  if (value && typeof value === 'object') {
    const clone = {};
    for (const [key, nested] of Object.entries(value)) {
      clone[key] = deepClone(nested);
    }
    return clone;
  }

  return value;
}

function toDate(value, fallbackDate) {
  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return new Date(fallbackDate.getTime());
  }
  return dateValue;
}

function clampToNow(dateValue, now) {
  if (dateValue.getTime() > now.getTime()) {
    return new Date(now.getTime());
  }
  return dateValue;
}

function toSentence(text) {
  const value = String(text ?? '').trim();
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function buildChangesDone(seed) {
  const start = (seed - 1) % UPDATE_CHANGE_ITEMS.length;
  const count = (seed % 3) + 1;
  const changes = [];
  for (let index = 0; index < count; index += 1) {
    changes.push(UPDATE_CHANGE_ITEMS[(start + index) % UPDATE_CHANGE_ITEMS.length]);
  }
  return changes;
}

function normalizeChangesDoneForSeed(value, seed) {
  const changes =
    typeof value === 'string'
      ? [value]
      : Array.isArray(value)
      ? value
      : [];

  const normalized = changes
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : buildChangesDone(seed);
}

function buildPersonName(seed, offset = 0) {
  const first = GIVEN_NAMES[(seed + offset) % GIVEN_NAMES.length];
  const last = FAMILY_NAMES[(seed * 3 + offset) % FAMILY_NAMES.length];
  return `${first} ${last}`;
}

function sanitizePeople(value, role, serial) {
  const roleOffset =
    role === 'Suspect' ? 2 : role === 'Victim' ? 7 : role === 'Guilty' ? 13 : 0;
  const source = Array.isArray(value) ? value : [];
  const people = source
    .map((entry, index) => {
      const rawName = String(entry?.name ?? '').trim();
      const parsedAge = Number(entry?.age);
      const name = rawName || buildPersonName(serial + index, roleOffset);
      const age = Number.isFinite(parsedAge) ? parsedAge : 20 + ((serial + index) % 35);
      return { name, age };
    })
    .filter((person) => person.name);

  if (people.length > 0) return people;
  return [{ name: buildPersonName(serial, roleOffset), age: 20 + (serial % 35) }];
}

function expandUsers(baseUsers, targetCount) {
  const users = deepClone(baseUsers);

  const profilePool = [
    { fullname: 'ARJUN PANDIT', city: 'Surat' },
    { fullname: 'BHUMIKA RATHOD', city: 'Rajkot' },
    { fullname: 'CHIRAG RAVAL', city: 'Ahmedabad' },
    { fullname: 'DHRUVI PATEL', city: 'Vadodara' },
    { fullname: 'EKTA MAKWANA', city: 'Bhavnagar' },
    { fullname: 'FALGUNI SHAH', city: 'Jamnagar' },
    { fullname: 'GAURAV DESHMUKH', city: 'Anand' },
    { fullname: 'HEMANGI MEHTA', city: 'Mehsana' },
    { fullname: 'ISHAN VASAVA', city: 'Kutch' },
    { fullname: 'JINAL TRIVEDI', city: 'Patan' },
    { fullname: 'KUNAL CHAUHAN', city: 'Junagadh' },
    { fullname: 'LALIT THAKKAR', city: 'Morbi' },
  ];

  const usedPoliceIds = new Set(users.map((user) => String(user.police_id ?? '').trim()));
  const usedContacts = new Set(users.map((user) => String(user.contact ?? '').trim()));
  const usedEmails = new Set(users.map((user) => String(user.email ?? '').toLowerCase().trim()));

  let serial = 1;
  const nextUniquePoliceId = () => {
    while (true) {
      const id = `SX${String(serial).padStart(6, '0')}`;
      serial += 1;
      if (!usedPoliceIds.has(id)) {
        usedPoliceIds.add(id);
        return id;
      }
    }
  };

  let contactSerial = 1;
  const nextUniqueContact = () => {
    while (true) {
      const contact = `8${String(700000000 + contactSerial).padStart(9, '0')}`;
      contactSerial += 1;
      if (!usedContacts.has(contact)) {
        usedContacts.add(contact);
        return contact;
      }
    }
  };

  let emailSerial = 1;
  const nextUniqueEmail = (fullname) => {
    const base = String(fullname)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '') || 'officer.seed';
    while (true) {
      const email = `${base}${emailSerial}@police.gov.in`;
      emailSerial += 1;
      if (!usedEmails.has(email)) {
        usedEmails.add(email);
        return email;
      }
    }
  };

  while (users.length < targetCount) {
    const profile = profilePool[(users.length - baseUsers.length) % profilePool.length];
    const fullname = profile.fullname;
    users.push({
      fullname,
      police_id: nextUniquePoliceId(),
      contact: nextUniqueContact(),
      email: nextUniqueEmail(fullname),
      city: profile.city,
      password: 'police123',
      isAdmin: false,
      isApproved: users.length % 4 !== 0,
    });
  }

  let finalUsers = users;
  if (users.length > targetCount) {
    const admin = users.find((user) => user.isAdmin) || users[0];
    const others = users.filter((user) => user !== admin).slice(0, Math.max(0, targetCount - 1));
    finalUsers = [admin, ...others];
  }

  let adminIndex = finalUsers.findIndex((user) => Boolean(user.isAdmin));
  if (adminIndex === -1 && finalUsers.length > 0) {
    adminIndex = 0;
  }

  finalUsers.forEach((user, index) => {
    user.isAdmin = index === adminIndex;
    if (user.isAdmin) {
      user.isApproved = true;
      user.password = user.password || 'admin123';
    }
  });

  return finalUsers;
}

function ensureCaseConditionCoverage(cases, now) {
  const coverage = [
    { status: 'ACTIVE', isApproved: true, is_removed: false },
    { status: 'ACTIVE', isApproved: true, is_removed: true },
    { status: 'ACTIVE', isApproved: false, is_removed: false },
    { status: 'ACTIVE', isApproved: false, is_removed: true },
    { status: 'CLOSE', isApproved: true, is_removed: false },
    { status: 'CLOSE', isApproved: true, is_removed: true },
    { status: 'CLOSE', isApproved: false, is_removed: false },
    { status: 'CLOSE', isApproved: false, is_removed: true },
  ];

  coverage.forEach((combo, index) => {
    const caseItem = cases[index];
    if (!caseItem) return;
    caseItem.status = combo.status;
    caseItem.isApproved = combo.isApproved;
    caseItem.is_removed = combo.is_removed;
    caseItem.updated_on = combo.isApproved
      ? clampToNow(new Date(toDate(caseItem.case_date, now).getTime() + 86400000), now)
      : null;
  });
}

function expandCases(baseCases, targetCount, users) {
  const now = new Date();
  const cases = deepClone(baseCases).map((caseItem) => ({
    ...caseItem,
    case_date: clampToNow(toDate(caseItem.case_date, now), now),
    updated_on: caseItem.updated_on ? clampToNow(toDate(caseItem.updated_on, now), now) : null,
  }));

  const approvedHandlers = users
    .filter((user) => Boolean(user.isApproved) && !Boolean(user.isAdmin))
    .map((user) => String(user.fullname).trim())
    .filter(Boolean);

  const handlerPool =
    approvedHandlers.length > 0
      ? approvedHandlers
      : users.map((user) => String(user.fullname).trim()).filter(Boolean);

  const conditionMatrix = [
    { status: 'ACTIVE', isApproved: true, is_removed: false },
    { status: 'CLOSE', isApproved: true, is_removed: false },
    { status: 'ACTIVE', isApproved: false, is_removed: false },
    { status: 'CLOSE', isApproved: false, is_removed: false },
    { status: 'ACTIVE', isApproved: true, is_removed: true },
    { status: 'CLOSE', isApproved: true, is_removed: true },
    { status: 'ACTIVE', isApproved: false, is_removed: true },
    { status: 'CLOSE', isApproved: false, is_removed: true },
  ];

  let serial = 1;
  while (cases.length < targetCount) {
    const template = baseCases[(serial - 1) % baseCases.length];
    const combo = conditionMatrix[(serial - 1) % conditionMatrix.length];
    const locality = LOCALITY_TAGS[(serial - 1) % LOCALITY_TAGS.length];
    const titleContext = CASE_TITLE_CONTEXT[(serial - 1) % CASE_TITLE_CONTEXT.length];
    const caseNote = CASE_NOTE_LINES[(serial - 1) % CASE_NOTE_LINES.length];

    const generatedDate = clampToNow(new Date(now.getTime() - serial * 86400000 * 2), now);
    const caseDoc = {
      ...deepClone(template),
      _id: new mongoose.Types.ObjectId(),
      case_title: `${template.case_title} - ${locality} ${titleContext}`,
      case_type: template.case_type,
      case_description: `${toSentence(template.case_description)} ${caseNote}`,
      case_date: generatedDate,
      case_handler: handlerPool[(serial - 1) % handlerPool.length] || template.case_handler,
      status: combo.status,
      isApproved: combo.isApproved,
      is_removed: combo.is_removed,
      updated_on: combo.isApproved
        ? clampToNow(new Date(generatedDate.getTime() + 86400000 * ((serial % 5) + 1)), now)
        : null,
    };

    let suspects = sanitizePeople(template.suspects, 'Suspect', serial);
    let victims = sanitizePeople(template.victim, 'Victim', serial);
    let guilty = sanitizePeople(template.guilty_name, 'Guilty', serial);

    if (serial % 4 === 0) suspects = [];
    if (serial % 5 === 0) victims = [];
    if (serial % 6 === 0) guilty = [];
    if (serial % 7 === 0) {
      suspects = [
        ...suspects,
        { name: buildPersonName(serial, 21), age: 22 + (serial % 18) },
      ];
    }
    if (combo.status === 'CLOSE' && guilty.length === 0 && suspects.length > 0) {
      guilty = [deepClone(suspects[0])];
    }

    caseDoc.suspects = suspects;
    caseDoc.victim = victims;
    caseDoc.guilty_name = guilty;

    cases.push(caseDoc);
    serial += 1;
  }

  let finalCases = cases;
  if (cases.length > targetCount) {
    finalCases = cases.slice(0, targetCount);
  }

  ensureCaseConditionCoverage(finalCases, now);
  return finalCases;
}

function expandUpdateCases(baseUpdates, targetCount, cases) {
  const now = new Date();
  const updates = deepClone(baseUpdates).map((update, index) => ({
    ...update,
    changes_done: normalizeChangesDoneForSeed(update.changes_done, index + 1),
    case_date: clampToNow(toDate(update.case_date, now), now),
    requestedAt: clampToNow(toDate(update.requestedAt, now), now),
  }));

  const updateTargetCases = cases.filter((caseItem) => !Boolean(caseItem.is_removed));
  const sourceCases = updateTargetCases.length > 0 ? updateTargetCases : cases;

  let serial = 1;
  while (updates.length < targetCount) {
    const caseTemplate = deepClone(sourceCases[(serial - 1) % sourceCases.length]);
    const requestedAt = clampToNow(new Date(now.getTime() - serial * 3600000 * 3), now);
    const proposedCaseDate = clampToNow(
      new Date(toDate(caseTemplate.case_date, now).getTime() + ((serial % 9) - 4) * 86400000),
      now
    );
    const updateSuffix = UPDATE_TITLE_SUFFIXES[(serial - 1) % UPDATE_TITLE_SUFFIXES.length];
    const updateNote = UPDATE_NOTE_LINES[(serial - 1) % UPDATE_NOTE_LINES.length];

    const suspects = sanitizePeople(caseTemplate.suspects, 'Suspect', serial);
    const victims = sanitizePeople(caseTemplate.victim, 'Victim', serial);
    const guilty =
      serial % 5 === 0
        ? []
        : sanitizePeople(caseTemplate.guilty_name, 'Guilty', serial).slice(0, Math.max(1, serial % 2 + 1));

    updates.push({
      originalCaseId: caseTemplate._id,
      case_title: `${caseTemplate.case_title} - ${updateSuffix}`,
      case_type: caseTemplate.case_type,
      case_description: `${toSentence(caseTemplate.case_description)} ${updateNote}`,
      changes_done: buildChangesDone(serial),
      suspects: serial % 4 === 0 ? [] : suspects,
      victim: serial % 6 === 0 ? [] : victims,
      guilty_name: guilty,
      case_date: proposedCaseDate,
      case_handler: caseTemplate.case_handler,
      status: serial % 2 === 0 ? 'ACTIVE' : 'CLOSE',
      requestedAt,
    });
    serial += 1;
  }

  if (updates.length > targetCount) {
    return updates.slice(0, targetCount);
  }
  return updates;
}

function expandReports(baseReports, targetCount, users) {
  const now = new Date();
  const reports = deepClone(baseReports).map((report) => ({
    ...report,
    date: clampToNow(toDate(report.date, now), now),
  }));

  const officerEmails = users
    .filter((user) => Boolean(user.isApproved))
    .map((user) => String(user.email).trim().toLowerCase())
    .filter(Boolean);

  let serial = 1;
  while (reports.length < targetCount) {
    const useOfficerEmail = serial % 3 === 0 && officerEmails.length > 0;
    const email = useOfficerEmail
      ? officerEmails[(serial - 1) % officerEmails.length]
      : `citizen.report${String(serial).padStart(3, '0')}@mail.com`;
    const subject = REPORT_SUBJECTS[(serial - 1) % REPORT_SUBJECTS.length];
    const detail = REPORT_DETAILS[(serial - 1) % REPORT_DETAILS.length];
    const requestLine = REPORT_REQUESTS[(serial - 1) % REPORT_REQUESTS.length];
    const locality = LOCALITY_TAGS[(serial + 2) % LOCALITY_TAGS.length];

    reports.push({
      email,
      reportText: `${subject} near ${locality}. ${detail} ${requestLine}`,
      date: clampToNow(new Date(now.getTime() - serial * 86400000 * 2), now),
    });
    serial += 1;
  }

  if (reports.length > targetCount) {
    return reports.slice(0, targetCount);
  }
  return reports;
}

function buildDataWithTargets(baseData, targets) {
  const users = expandUsers(baseData.users, targets.users);
  const cases = expandCases(baseData.cases, targets.cases, users);
  const updatecases = expandUpdateCases(baseData.updatecases, targets.updatecases, cases);
  const reports = expandReports(baseData.reports, targets.reports, users);

  return { users, cases, updatecases, reports };
}

function summarizeCaseConditionCoverage(cases) {
  const summary = {};
  for (const caseItem of cases) {
    const key = `${caseItem.status}|approved:${Boolean(caseItem.isApproved)}|removed:${Boolean(caseItem.is_removed)}`;
    summary[key] = (summary[key] || 0) + 1;
  }
  return summary;
}

function summarizeUsers(users) {
  const adminCount = users.filter((user) => Boolean(user.isAdmin)).length;
  const approvedCount = users.filter((user) => Boolean(user.isApproved)).length;
  const pendingCount = users.length - approvedCount;
  return { adminCount, approvedCount, pendingCount };
}

function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_HASH_REGEX.test(value);
}

async function hashUserPasswords(users) {
  return Promise.all(
    users.map(async (user) => {
      const password = String(user?.password ?? '');
      if (isBcryptHash(password)) return user;
      return {
        ...user,
        password: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
      };
    })
  );
}

async function run() {
  const previewOnly = process.argv.includes('--preview');
  const targets = readTargetsFromArgs();
  const baseData = loadSeedDataFromMongoshScript();
  const data = buildDataWithTargets(baseData, targets);
  data.users = await hashUserPasswords(data.users);

  const counts = {
    users: data.users.length,
    cases: data.cases.length,
    updatecases: data.updatecases.length,
    reports: data.reports.length,
  };

  if (previewOnly) {
    console.log('Preview counts:', counts);
    console.log('User summary:', summarizeUsers(data.users));
    console.log('Case condition coverage:', summarizeCaseConditionCoverage(data.cases));
    return;
  }

  await mongoose.connect(MONGO_URI, { dbName: MONGO_DB });
  const dbRef = mongoose.connection.db;

  await dbRef.collection('users').deleteMany({});
  await dbRef.collection('cases').deleteMany({});
  await dbRef.collection('updatecases').deleteMany({});
  await dbRef.collection('reports').deleteMany({});

  if (data.users.length) await dbRef.collection('users').insertMany(data.users);
  if (data.cases.length) await dbRef.collection('cases').insertMany(data.cases);
  if (data.updatecases.length) await dbRef.collection('updatecases').insertMany(data.updatecases);
  if (data.reports.length) await dbRef.collection('reports').insertMany(data.reports);

  console.log('Seed inserted successfully:', counts);
  console.log('User summary:', summarizeUsers(data.users));
  console.log('Case condition coverage:', summarizeCaseConditionCoverage(data.cases));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors
  }
  process.exit(1);
});
