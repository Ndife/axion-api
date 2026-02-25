module.exports = {
  createStudent: [
    {
      path: 'firstName',
      type: 'string',
      length: { min: 2, max: 50 },
      required: true,
    },
    {
      path: 'lastName',
      type: 'string',
      length: { min: 2, max: 50 },
      required: true,
    },
    { path: 'age', type: 'number', required: true, min: 1, max: 80 },
    { model: 'schoolId', required: true },
    { model: 'classroomId' },
  ],
  updateStudent: [
    { path: 'firstName', type: 'string', length: { min: 2, max: 50 } },
    { path: 'lastName', type: 'string', length: { min: 2, max: 50 } },
    { path: 'age', type: 'number' },
  ],
  transferStudent: [
    { model: 'classroomId' },
    { model: 'schoolId' },
  ],
  getStudents: [
    { model: 'schoolId' },
    { model: 'classroomId' },
    { path: 'page', type: 'number' },
    { path: 'limit', type: 'number' },
  ],
  getStudent: [
    {
      model: 'id',
      required: true,
    },
  ],
  deleteStudent: [
    {
      model: 'id',
      required: true,
    },
  ],
};
