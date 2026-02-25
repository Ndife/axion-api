const request = require('supertest');
const createTestApp = require('./createTestApp');

let app, mongoose;
let __shortTokenSuper, __shortTokenAdmin1;
let schoolId1, schoolId2;
let classroomId1, classroomId2, classroomIdFull;
let studentId;

beforeAll(async () => {
  const testEnv = await createTestApp('student');
  app = testEnv.app;
  mongoose = testEnv.mongoose;

  let res = await request(app).post('/api/user/createUser').send({
    username: 'superAdmin',
    email: 'super@student.com',
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

  res = await request(app)
    .post('/api/classroom/createClassroom')
    .set('token', __shortTokenAdmin1)
    .send({
      name: 'Room A',
      capacity: 30,
      schoolId: schoolId1,
    });
  classroomId1 = res.body.data.classroom._id;

  res = await request(app)
    .post('/api/classroom/createClassroom')
    .set('token', __shortTokenAdmin1)
    .send({
      name: 'Room B',
      capacity: 30,
      schoolId: schoolId1,
    });
  classroomId2 = res.body.data.classroom._id;

  res = await request(app)
    .post('/api/classroom/createClassroom')
    .set('token', __shortTokenAdmin1)
    .send({
      name: 'Small Room',
      capacity: 1,
      schoolId: schoolId1,
    });
  classroomIdFull = res.body.data.classroom._id;
});

afterAll(async () => {
  if (mongoose) await mongoose.connection.close();
});

describe('Student API & Capacity Transactions', () => {
  it('Should create a student and increment classroom capacity', async () => {
    const response = await request(app)
      .post('/api/student/createStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        firstName: 'John',
        lastName: 'Doe',
        age: 15,
        schoolId: schoolId1,
        classroomId: classroomId1,
      });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.student.studentId).toMatch(/^STU-[A-Z0-9]{6}$/);
    studentId = response.body.data.student._id;

    const roomA = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId1 });
    expect(roomA.body.data.classroom.currentStudents).toBe(1);
  });

  it('Should retrieve a list of students', async () => {
    const response = await request(app)
      .get('/api/student/getStudents')
      .set('token', __shortTokenAdmin1)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.students.length).toBe(1);
  });

  it('Should update a student (PATCH)', async () => {
    const response = await request(app)
      .patch('/api/student/updateStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        id: studentId,
        age: 16,
      });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.student.age).toBe(16);
    expect(response.body.data.student.firstName).toBe('John');
  });

  it('Should transfer a student and update capacities (PATCH)', async () => {
    const transferRes = await request(app)
      .patch('/api/student/transferStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        id: studentId,
        classroomId: classroomId2,
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.ok).toBe(true);
    expect(transferRes.body.data.student.classroomId.toString()).toBe(
      classroomId2.toString(),
    );

    const roomA = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId1 });
    expect(roomA.body.data.classroom.currentStudents).toBe(0);

    const roomB = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId2 });
    expect(roomB.body.data.classroom.currentStudents).toBe(1);
  });

  it('Should prevent transferring into a full classroom', async () => {
    await request(app)
      .post('/api/student/createStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        firstName: 'Jane',
        lastName: 'Smith',
        age: 14,
        schoolId: schoolId1,
        classroomId: classroomIdFull,
      });

    const transferRes = await request(app)
      .patch('/api/student/transferStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        id: studentId,
        classroomId: classroomIdFull,
      });

    expect(transferRes.status).toBe(400);
    expect(transferRes.body.ok).toBe(false);
    expect(transferRes.body.message).toContain('Classroom is at capacity');
  });

  it('Should handle edge case: remove student from classroom completely', async () => {
    const transferRes = await request(app)
      .patch('/api/student/transferStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        id: studentId,
        classroomId: null,
      });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.ok).toBe(true);

    const roomB = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId2 });
    expect(roomB.body.data.classroom.currentStudents).toBe(0);
  });

  it('Should free up capacity when deleting a student', async () => {
    await request(app)
      .patch('/api/student/transferStudent')
      .set('token', __shortTokenAdmin1)
      .send({
        id: studentId,
        classroomId: classroomId1,
      });

    let roomA = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId1 });
    expect(roomA.body.data.classroom.currentStudents).toBe(1);

    const deleteRes = await request(app)
      .delete('/api/student/deleteStudent')
      .set('token', __shortTokenAdmin1)
      .send({ id: studentId });

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.ok).toBe(true);

    roomA = await request(app)
      .get('/api/classroom/getClassroom')
      .set('token', __shortTokenAdmin1)
      .query({ id: classroomId1 });
    expect(roomA.body.data.classroom.currentStudents).toBe(0);
  });
});
