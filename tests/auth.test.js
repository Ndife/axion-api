const request = require('supertest');
const createTestApp = require('./createTestApp');

let app, mongoose;
let __shortTokenSuper, __longTokenSuper;

beforeAll(async () => {
  const testEnv = await createTestApp('auth');
  app = testEnv.app;
  mongoose = testEnv.mongoose;
});

afterAll(async () => {
  if (mongoose) await mongoose.connection.close();
});

describe('User Authentication API', () => {
  it('Superadmin Registration (Create User)', async () => {
    const response = await request(app).post('/api/user/createUser').send({
      username: 'superAdmin',
      email: 'super@school.com',
      password: 'password123',
      role: 'super_admin',
    });
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.user.role).toBe('super_admin');
    expect(response.body.data.longToken).toBeDefined();
    expect(response.body.data.shortToken).toBeDefined();
    __longTokenSuper = response.body.data.longToken;
    __shortTokenSuper = response.body.data.shortToken;
  });

  it('User Login', async () => {
    const response = await request(app).post('/api/user/loginUser').send({
      email: 'super@school.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.longToken).toBeDefined();
    expect(response.body.data.shortToken).toBeDefined();
  });

  it('Should successfully logout User and deny blocklisted token', async () => {
    const createRes = await request(app).post('/api/user/createUser').send({
      username: 'logoutTestAdmin',
      email: 'logout@school.com',
      password: 'password123',
      role: 'super_admin',
    });

    expect(createRes.status).toBe(200);
    const logoutToken = createRes.body.data.shortToken;

    const logoutRes = await request(app)
      .post('/api/user/logoutUser')
      .send({ token: logoutToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.ok).toBe(true);

    const blockedRes = await request(app)
      .get('/api/school/getSchools')
      .set('token', logoutToken)
      .send({});

    expect(blockedRes.status).toBe(401);
    expect(blockedRes.body.ok).toBe(false);
    expect(blockedRes.body.message).toBe('token revoked');
  });

  it('Should successfully Issue a Refresh Token (Short Token) from Long Token', async () => {
    const response = await request(app)
      .post('/api/token/v1_createShortToken')
      .set('token', __longTokenSuper)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.shortToken).toBeDefined();

    const decoded = require('jsonwebtoken').decode(
      response.body.data.shortToken,
    );
    expect(decoded.role).toBe('super_admin');
    expect(decoded.jti).toBeDefined();
  });
});
