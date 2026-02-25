module.exports = {
  createSchool: [
    { model: 'name', required: true },
    { model: 'email', required: true },
    {
      path: 'address',
      type: 'string',
      length: { min: 5, max: 200 },
      required: true,
    },
    {
      path: 'phone',
      type: 'string',
      length: { min: 7, max: 15 },
      required: true,
    },
  ],
  updateSchool: [
    { model: 'id', required: true },
    { model: 'name' },
    { model: 'email' },
    { path: 'address', type: 'string', length: { min: 5, max: 200 } },
    { path: 'phone', type: 'string', length: { min: 7, max: 15 } },

  ],
  getSchool: [
    { model: 'id', required: true },
  ],
  getSchools: [
    { model: 'page' },
    { model: 'limit' },
  ],
  deleteSchool: [
    { model: 'id', required: true },
  ],
};
