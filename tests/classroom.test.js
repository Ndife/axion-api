const request = require('supertest');
const createTestApp = require('./createTestApp');

let app, mongoose;
let __shortTokenSuper, __shortTokenAdmin1, __shortTokenAdmin2;
let schoolId1, schoolId2;
let classroomId;

beforeAll(async () => {
  const testEnv = await createTestApp('classroom');
  app = testEnv.app;
  mongoose = testEnv.mongoose;

  let res = await request(app).post('/api/user/createUser').send({
    username: 'superAdmin',
    email: 'super@classroom.com',
    password: 'password123',
    role: 'super_admin',
  });
  __shortTokenSuper = res.body.data.shortToken;

  res = await request(app)
    .post('/api/school/createSchool')
    .set('token', __shortTokenSuper)
    .send({
      name: 'School 1',
      address: '123 Fake St',
      phone: '555-1234',
      email: 's1@test.com',
    });
  schoolId1 = res.body.data.school._id;

  res = await request(app)
    .post('/api/school/createSchool')
    .set('token', __shortTokenSuper)
    .send({
      name: 'School 2',
      address: '456 Fake St',
      phone: '555-5678',
      email: 's2@test.com',
    });
  schoolId2 = res.body.data.school._id;

  res = await request(app).post('/api/user/createUser').send({
    username: 'admin1',
    email: 'a1@test.com',
    password: 'password123',
    role: 'school_admin',
    schoolId: schoolId1,
  });
  __shortTokenAdmin1 = res.body.data.shortToken;

  res = await request(app).post('/api/user/createUser').send({
    username: 'admin2',
    email: 'a2@test.com',
    password: 'password123',
    role: 'school_admin',
    schoolId: schoolId2,
  });
  __shortTokenAdmin2 = res.body.data.shortToken;
});

afterAll(async () => {
  if (mongoose) await mongoose.connection.close();
});

describe('Classroom API & RBAC', () => {
  it('Should allow School Admin 1 to create a classroom in School 1', async () => {
    const response = await request(app)
      .post('/api/classroom/createClassroom')
      .set('token', __shortTokenAdmin1)
      .send({
        name: 'Math 101',
        capacity: 30,
        schoolId: schoolId1,
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    classroomId = response.body.data.classroom._id;
  });

  it('Should block School Admin 1 from creating a classroom in School 2', async () => {
    const response = await request(app)
      .post('/api/classroom/createClassroom')
      .set('token', __shortTokenAdmin1)
      .send({
        name: 'Science 101',
        capacity: 30,
        schoolId: schoolId2,
      });

    expect(response.status).toBe(403);
    expect(response.body.ok).toBe(false);
  });

  it('Should prevent creating a classroom with a duplicate name in the same school', async () => {
    const response = await request(app)
      .post('/api/classroom/createClassroom')
      .set('token', __shortTokenAdmin1)
      .send({
        name: 'Math 101',
        capacity: 25,
        schoolId: schoolId1,
      });

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
    expect(response.body.message).toContain('already exists');
  });

  it('Should retrieve a single classroom by ID (getClassroom)', async () => {
    const response = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.classroom.name).toBe('Math 101');
  });

  it('Should add a resource to a classroom (addResource)', async () => {
    const response = await request(app)
      .post('/api/classroom/addResource')
      .set('token', __shortTokenAdmin1)
      .send({
        id: classroomId,
        name: 'Projector',
        quantity: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.classroom.resources.length).toBe(1);
    expect(response.body.data.classroom.resources[0].name).toBe('Projector');
  });

  it('Should increment the quantity if adding the same resource again', async () => {
    const response = await request(app)
      .post('/api/classroom/addResource')
      .set('token', __shortTokenAdmin1)
      .send({
        id: classroomId,
        name: 'Projector',
        quantity: 2,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.classroom.resources[0].quantity).toBe(2);
  });

  it('Should remove a resource from a classroom (removeResource)', async () => {
    let current = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId });
    let resId = current.body.data.classroom.resources[0]._id;

    const response = await request(app)
      .delete('/api/classroom/removeResource')
      .set('token', __shortTokenAdmin1)
      .send({
        id: classroomId,
        resourceId: resId,
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.classroom.resources.length).toBe(0);
  });

  it('Should update a classroom (updateClassroom)', async () => {
    const response = await request(app)
      .patch('/api/classroom/updateClassroom')
      .set('token', __shortTokenAdmin1)
      .send({
        id: classroomId,
        name: 'Advanced Math 201',
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.classroom.name).toBe('Advanced Math 201');
  });

  it('Should delete a classroom', async () => {
    const response = await request(app)
      .delete('/api/classroom/deleteClassroom')
      .set('token', __shortTokenSuper)
      .send({ id: classroomId });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
