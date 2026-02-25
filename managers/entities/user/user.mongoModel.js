const mongoose = require('mongoose');
const { ROLES, ROLE_VALUES } = require('../../_common/constants');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: ROLES.SCHOOL_ADMIN,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
