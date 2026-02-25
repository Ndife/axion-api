module.exports = {
  createClassroom: [
    { model: 'name', required: true },
    { path: 'capacity', type: 'number', required: true },
    { model: 'schoolId', required: true },
  ],
  updateClassroom: [
    { model: 'name' },
    { path: 'capacity', type: 'number' },
    { model: 'schoolId' },
  ],
  getClassroom: [
    { model: 'id', required: true },
  ],
  getClassrooms: [
    { model: 'schoolId', required: true },
    { model: 'page' },
    { model: 'limit' },
  ],
  deleteClassroom: [
    { model: 'id', required: true },
  ],
  addResource: [
    { model: 'id', required: true },
    { model: 'name', required: true },
    { path: 'quantity', type: 'number', required: true },
  ],
  removeResource: [
    { model: 'id', required: true },
    { 
      path: 'resourceId', 
      type: 'string',
      length: { min: 24, max: 24 },
      regex: /^[a-fA-F0-9]{24}$/,
      required: true,
    },
  ],
};
