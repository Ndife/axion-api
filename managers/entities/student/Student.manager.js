const { ROLES } = require('../../_common/constants');
const { customAlphabet } = require('nanoid');
const generateStudentId = customAlphabet(
  '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  6,
);

module.exports = class Student {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.tokenManager = managers.token;
    this.httpExposed = [
      'post=createStudent',
      'get=getStudents',
      'get=getStudent',
      'patch=updateStudent',
      'delete=deleteStudent',
      'patch=transferStudent',
    ];
  }

  async createStudent({
    __schoolAdmin,
    firstName,
    lastName,
    age,
    schoolId,
    classroomId,
  }) {
    if (
      __schoolAdmin.role !== ROLES.SUPER_ADMIN &&
      __schoolAdmin.schoolId !== schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to create student for this school',
      };
    }

    const validationError = await this.validators.student.createStudent({
      firstName,
      lastName,
      age,
      schoolId,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    const session = await this.mongomodels.student.startSession();
    try {
      session.startTransaction();

      if (classroomId) {
        const updatedRoom = await this.mongomodels.classroom.findOneAndUpdate(
          {
            _id: classroomId,
            schoolId: schoolId,
            $expr: { $lt: ['$currentStudents', '$capacity'] },
          },
          { $inc: { currentStudents: 1 } },
          { new: true, session },
        );

        if (!updatedRoom) {
          return {
            ok: false,
            code: 400,
            error:
              'Classroom is at full capacity or does not exist in this school',
          };
        }
      }

      const studentId = `STU-${generateStudentId()}`;

      const createdStudent = new this.mongomodels.student({
        studentId,
        firstName,
        lastName,
        age,
        schoolId,
        classroomId,
      });

      await createdStudent.save({ session });
      await session.commitTransaction();
      return { ok: true, code: 201, student: createdStudent };
    } catch (error) {
      await session.abortTransaction();
      return {
        ok: false,
        code: 500,
        error: error.message || 'Transaction failed',
      };
    } finally {
      session.endSession();
    }
  }

  async getStudents({
    __schoolAdmin,
    schoolId,
    classroomId,
    page = 1,
    limit = 10,
  }) {
    const validationError = await this.validators.student.getStudents({
      schoolId,
      classroomId,
      page,
      limit,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let query = {};
    if (schoolId) query.schoolId = schoolId;
    if (classroomId) query.classroomId = classroomId;

    if (__schoolAdmin.role === ROLES.SCHOOL_ADMIN) {
      query.schoolId = __schoolAdmin.schoolId;
    }

    let skip = (page - 1) * limit;
    let total = await this.mongomodels.student.countDocuments(query);
    let students = await this.mongomodels.student
      .find(query)
      .skip(skip)
      .limit(limit);

    return {
      ok: true,
      code: 200,
      students,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStudent({ __schoolAdmin, id }) {
    const validationError = await this.validators.student.getStudent({ id });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let student = await this.mongomodels.student.findById(id);
    if (!student) return { ok: false, code: 404, error: 'Student not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      student.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to view this student',
      };
    }

    return { ok: true, code: 200, student };
  }

  async updateStudent({ __schoolAdmin, id, firstName, lastName, age }) {
    const validationError = await this.validators.student.updateStudent({
      id,
      firstName,
      lastName,
      age,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let student = await this.mongomodels.student.findById(id);
    if (!student) return { ok: false, code: 404, error: 'Student not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      student.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to update this student',
      };
    }

    let updateData = { firstName, lastName, age };
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    student = await this.mongomodels.student.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return { ok: true, code: 200, student };
  }

  async deleteStudent({ __schoolAdmin, id }) {
    let validationError = await this.validators.student.deleteStudent({ id });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let student = await this.mongomodels.student.findById(id);
    if (!student) return { ok: false, code: 404, error: 'Student not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      student.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to delete this student',
      };
    }

    const session = await this.mongomodels.student.startSession();
    try {
      session.startTransaction();

      if (student.classroomId) {
        await this.mongomodels.classroom.findOneAndUpdate(
          { _id: student.classroomId, currentStudents: { $gt: 0 } },
          { $inc: { currentStudents: -1 } },
          { session },
        );
      }

      await this.mongomodels.student.findByIdAndDelete(id, { session });

      await session.commitTransaction();
      return { ok: true, code: 200, message: 'Student deleted successfully' };
    } catch (error) {
      await session.abortTransaction();
      return {
        ok: false,
        code: 500,
        error: error.message || 'Transaction failed',
      };
    } finally {
      session.endSession();
    }
  }

  async transferStudent({ __schoolAdmin, id, schoolId, classroomId }) {
    const validationError = await this.validators.student.transferStudent({
      classroomId,
      schoolId,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let student = await this.mongomodels.student.findById(id);
    if (!student) return { ok: false, code: 404, error: 'Student not found' };

    if (__schoolAdmin.role === ROLES.SCHOOL_ADMIN) {
      if (student.schoolId.toString() !== __schoolAdmin.schoolId) {
        return {
          ok: false,
          code: 403,
          error: 'Unauthorized to transfer this student',
        };
      }
      if (schoolId && schoolId !== __schoolAdmin.schoolId) {
        return {
          ok: false,
          code: 403,
          error: 'School Admins can only transfer within their own school',
        };
      }
    }

    let updateData = {};
    if (schoolId) updateData.schoolId = schoolId;
    if (classroomId !== undefined) updateData.classroomId = classroomId;

    const session = await this.mongomodels.student.startSession();
    try {
      session.startTransaction();

      if (
        classroomId &&
        student.classroomId &&
        classroomId.toString() !== student.classroomId.toString()
      ) {
        const newRoom = await this.mongomodels.classroom.findOneAndUpdate(
          {
            _id: classroomId,
            schoolId: schoolId || student.schoolId,
            $expr: { $lt: ['$currentStudents', '$capacity'] },
          },
          { $inc: { currentStudents: 1 } },
          { new: true, session },
        );

        if (!newRoom) {
          return {
            ok: false,
            code: 400,
            error: 'Destination Classroom is at capacity or does not exist',
          };
        }

        await this.mongomodels.classroom.findOneAndUpdate(
          { _id: student.classroomId, currentStudents: { $gt: 0 } },
          { $inc: { currentStudents: -1 } },
          { session },
        );
      } else if (classroomId && !student.classroomId) {
        const newRoom = await this.mongomodels.classroom.findOneAndUpdate(
          {
            _id: classroomId,
            schoolId: schoolId || student.schoolId,
            $expr: { $lt: ['$currentStudents', '$capacity'] },
          },
          { $inc: { currentStudents: 1 } },
          { new: true, session },
        );

        if (!newRoom) {
          return {
            ok: false,
            code: 400,
            error: 'Destination Classroom is at capacity or does not exist',
          };
        }
      } else if (classroomId === null || classroomId === '') {
        if (student.classroomId) {
          await this.mongomodels.classroom.findOneAndUpdate(
            { _id: student.classroomId, currentStudents: { $gt: 0 } },
            { $inc: { currentStudents: -1 } },
            { session },
          );
        }
      }

      student = await this.mongomodels.student.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          session,
        },
      );

      await session.commitTransaction();
      return { ok: true, code: 200, student, message: 'Transfer successful' };
    } catch (error) {
      await session.abortTransaction();
      return {
        ok: false,
        code: 500,
        error: error.message || 'Transaction failed',
      };
    } finally {
      session.endSession();
    }
  }
};
