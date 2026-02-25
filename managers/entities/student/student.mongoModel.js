const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50,
    },
    age: {
      type: Number,
      required: true,
      min: 3,
      max: 100,
    },
    studentId: {
      type: String,
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      default: null,
    },
  },
  { timestamps: true },
);

studentSchema.index({ schoolId: 1 });
studentSchema.index({ classroomId: 1 });
studentSchema.index({ studentId: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
