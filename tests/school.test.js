const request = require('supertest');
const createTestApp = require('./createTestApp');

let app, mongoose;
let __shortTokenSuper, __shortTokenAdmin;
let schoolId1, schoolId2;

beforeAll(async () => {
  const testEnv = await createTestApp('school');
  app = testEnv.app;
  mongoose = testEnv.mongoose;

  const superRes = await request(app).post('/api/user/createUser').send({
    username: 'superadmin_school',
    email: 'super_school@test.com',
    password: 'password123',
    role: 'super_admin',
  });
  __shortTokenSuper = superRes.body.data.shortToken;
});

afterAll(async () => {
  if (mongoose) await mongoose.connection.close();
});

describe('School API', () => {
  it('Should create a school successfully (createSchool)', async () => {
    const response = await request(app)
      .post('/api/school/createSchool')
      .set('token', __shortTokenSuper)
      .send({
        name: 'Springfield High',
        address: '123 Fake Street',
        phone: '555-1234',
        email: 'info@springfield.com',
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.school._id).toBeDefined();
    schoolId1 = response.body.data.school._id;
  });

  it('Should create a second school', async () => {
    const response = await request(app)
      .post('/api/school/createSchool')
      .set('token', __shortTokenSuper)
      .send({
        name: 'Shelbyville Elementary',
        address: '456 Fake Street',
        phone: '555-5678',
        email: 'info@shelbyville.com',
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    schoolId2 = response.body.data.school._id;
  });

  it('Should retrieve schools list', async () => {
    const response = await request(app)
      .get('/api/school/getSchools')
      .set('token', __shortTokenSuper);

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.schools.length).toBeGreaterThanOrEqual(2);
  });

  it('Should update a school', async () => {
    const response = await request(app)
      .patch('/api/school/updateSchool')
      .set('token', __shortTokenSuper)
      .send({
        id: schoolId1,
        name: 'Springfield High Updated',
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.school.name).toBe('Springfield High Updated');
  });

  it('Should allow School Admin to view their own school (getSchool)', async () => {
    const adminRes = await request(app).post('/api/user/createUser').send({
      username: 'school_admin1',
      email: 'admin1@springfield.com',
      password: 'password123',
      role: 'school_admin',
      schoolId: schoolId1,
    });
    __shortTokenAdmin = adminRes.body.data.shortToken;

    const response = await request(app)
      .get('/api/school/getSchool')
      .set('token', __shortTokenAdmin)
      .query({ id: schoolId1 });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.school._id.toString()).toBe(schoolId1.toString());
  });

  it('Should block School Admin from viewing a different school (getSchool RBAC)', async () => {
    const response = await request(app)
      .get('/api/school/getSchool')
      .set('token', __shortTokenAdmin)
      .query({ id: schoolId2 });

    expect(response.status).toBe(403);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toBe('Unauthorized to view this school');
  });

  it('Should delete a school', async () => {
    const response = await request(app)
      .delete('/api/school/deleteSchool')
      .set('token', __shortTokenSuper)
      .send({
        id: schoolId2,
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
