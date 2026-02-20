const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');

const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/';
const PROD_MONGO_URI =
  'mongodb+srv://pritchotaliya206gmailcom:123123123@cluster0.ylfbtmd.mongodb.net/?appName=Cluster0';
const MONGO_URI = isProduction ? PROD_MONGO_URI : LOCAL_MONGO_URI;
const MONGO_DB = 'police_info';

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

async function run() {
  const previewOnly = process.argv.includes('--preview');
  const data = loadSeedDataFromMongoshScript();

  const counts = {
    users: data.users.length,
    cases: data.cases.length,
    updatecases: data.updatecases.length,
    reports: data.reports.length,
  };

  if (previewOnly) {
    console.log('Preview counts:', counts);
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
