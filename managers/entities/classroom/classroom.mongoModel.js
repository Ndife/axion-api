const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
    },
    resources: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
      },
    ],
    currentStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
  },
  { timestamps: true },
);

classroomSchema.index({ schoolId: 1 });
classroomSchema.index({ name: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);
