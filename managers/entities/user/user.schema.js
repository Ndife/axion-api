

module.exports = {
  createUser: [
    { model: 'username', required: true },
    { model: 'email', required: true },
    { model: 'password', required: true },
    { model: 'role' },
    { model: 'schoolId' },
  ],
  loginUser: [
    { model: 'email', required: true },
    { model: 'password', required: true },
  ],
};




