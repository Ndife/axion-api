const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 100,
    },
    address: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 200,
    },
    phone: {
      type: String,
      required: true,
      minlength: 7,
      maxlength: 15,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('School', schoolSchema);
