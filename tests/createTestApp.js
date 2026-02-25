process.env.NODE_ENV = 'test';
process.env.LONG_TOKEN_SECRET = 'test_long_secret';
process.env.SHORT_TOKEN_SECRET = 'test_short_secret';

const express = require('express');
const mongoose = require('mongoose');
const ManagersLoader = require('../loaders/ManagersLoader');
const ValidatorsLoader = require('../loaders/ValidatorsLoader');
const MongoLoader = require('../loaders/MongoLoader');
const config = require('../config/index.config.js');
config.dotEnv.LONG_TOKEN_SECRET = 'test_long_secret';
config.dotEnv.SHORT_TOKEN_SECRET = 'test_short_secret';

const models = require('../managers/_common/schema.models');
const customValidators = require('../managers/_common/schema.validators');

module.exports = async function createTestApp(dbSuffix) {
  process.env.MONGO_URI = `mongodb://localhost:27017/school_management_test_${dbSuffix}`;
  config.dotEnv.MONGO_URI = process.env.MONGO_URI;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const validatorsLoader = new ValidatorsLoader({ models, customValidators });
  const validators = validatorsLoader.load();

  const customValidatorsMock = { ...customValidators };
  if (!customValidatorsMock.username) {
    customValidatorsMock.username = (val) => val && val.length >= 3;
  }
  if (!customValidatorsMock.role) {
    customValidatorsMock.role = (role) =>
      ['super_admin', 'school_admin'].includes(role);
  }

  if (!validators.user) {
    const Pine = require('qantra-pineapple');
    const pine = new Pine({ models, customValidators: customValidatorsMock });
    const userSchema = require('../managers/entities/user/user.schema.js');
    validators.user = {
      createUser: async (data) => pine.validate(data, userSchema.createUser),
      createUserTrimmer: async (data) => pine.trim(data, userSchema.createUser),
    };
  }

  const mongoModels = new MongoLoader({
    schemaExtension: 'mongoModel.js',
  }).load();

  const mockOysterData = {};
  const oysterMock = {
    call: jest.fn(async (cmd, key, value) => {
      if (cmd === 'set') {
        mockOysterData[key] = value;
        return 'OK';
      }
      if (cmd === 'get') {
        return mockOysterData[key];
      }
      return null;
    }),
  };

  const mockCacheData = {};
  const cacheMock = {
    key: {
      set: async ({ key, data }) => {
        mockCacheData[key] = data;
        return 'OK';
      },
      get: async ({ key }) => {
        return mockCacheData[key];
      },
    },
  };

  const cortexMock = {
    sub: jest.fn(),
    pub: jest.fn(),
    nodeId: 'test-node',
  };

  const managersLoader = new ManagersLoader({
    config,
    cache: cacheMock,
    cortex: cortexMock,
    oyster: oysterMock,
    aeon: {},
    mongomodels: mongoModels,
  });

  managersLoader.validators = validators;
  const managers = managersLoader.load();

  app.all('/api/:moduleName/:fnName', managers.userApi.mw);

  await mongoose.connect(config.dotEnv.MONGO_URI);
  await mongoose.connection.db.dropDatabase();
  for (const modelName of Object.keys(mongoose.models)) {
    await mongoose.models[modelName].syncIndexes();
  }

  return { app, managers, mongoose };
};
