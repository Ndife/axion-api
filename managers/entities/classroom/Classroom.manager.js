const { ROLES } = require('../../_common/constants');

module.exports = class Classroom {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.tokenManager = managers.token;
    this.httpExposed = [
      'post=createClassroom',
      'get=getClassrooms',
      'get=getClassroom',
      'patch=updateClassroom',
      'delete=deleteClassroom',
      'post=addResource',
      'delete=removeResource',
    ];
  }

  async createClassroom({ __schoolAdmin, name, capacity, schoolId }) {
    if (
      __schoolAdmin.role !== ROLES.SUPER_ADMIN &&
      __schoolAdmin.schoolId !== schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to create classroom for this school',
      };
    }

    const validationError = await this.validators.classroom.createClassroom({
      name,
      capacity,
      schoolId,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    const createdClassroom = new this.mongomodels.classroom({
      name,
      capacity,
      schoolId,
    });

    try {
      await createdClassroom.save();
    } catch (error) {
      if (error.code === 11000) {
        return {
          ok: false,
          code: 400,
          error: `A classroom with the name '${name}' already exists in this school.`,
        };
      }
      return { ok: false, code: 500, error: 'Failed to create classroom' };
    }

    return { ok: true, code: 201, classroom: createdClassroom };
  }

  async getClassrooms({ __schoolAdmin, schoolId, page = 1, limit = 10 }) {
    const validationError = await this.validators.classroom.getClassrooms({
      schoolId,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let query = schoolId ? { schoolId } : {};

    // School admins can only see their school's classrooms
    if (__schoolAdmin.role === ROLES.SCHOOL_ADMIN) {
      query.schoolId = __schoolAdmin.schoolId;
    }

    let skip = (page - 1) * limit;
    let total = await this.mongomodels.classroom.countDocuments(query);
    let classrooms = await this.mongomodels.classroom
      .find(query)
      .skip(skip)
      .limit(limit);

    return {
      classrooms,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getClassroom({ __schoolAdmin, id }) {
    const validationError = await this.validators.classroom.getClassroom({
      id,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let classroom = await this.mongomodels.classroom.findById(id);
    if (!classroom)
      return { ok: false, code: 404, error: 'Classroom not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      classroom.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to view this classroom',
      };
    }

    return { ok: true, code: 200, classroom };
  }

  async updateClassroom({ __schoolAdmin, id, name, capacity, schoolId }) {
    const validationError = await this.validators.classroom.updateClassroom({
      id,
      name,
      capacity,
      schoolId,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let classroom = await this.mongomodels.classroom.findById(id);
    if (!classroom)
      return { ok: false, code: 404, error: 'Classroom not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      classroom.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to update this classroom',
      };
    }

    let updateData = { name, capacity, schoolId };
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    try {
      classroom = await this.mongomodels.classroom.findByIdAndUpdate(
        id,
        updateData,
        { new: true },
      );
    } catch (error) {
      if (error.code === 11000) {
        return {
          ok: false,
          code: 400,
          error: `A classroom with the name '${name}' already exists in this school.`,
        };
      }
      return { ok: false, code: 500, error: 'Failed to update classroom' };
    }

    return { ok: true, code: 200, classroom };
  }

  async deleteClassroom({ __schoolAdmin, id }) {
    const validationError = await this.validators.classroom.deleteClassroom({
      id,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let classroom = await this.mongomodels.classroom.findById(id);
    if (!classroom)
      return { ok: false, code: 404, error: 'Classroom not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      classroom.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to delete this classroom',
      };
    }

    await this.mongomodels.classroom.findByIdAndDelete(id);
    return { ok: true, code: 200, message: 'Classroom deleted successfully' };
  }

  async addResource({ __schoolAdmin, id, name, quantity }) {
    const validationError = await this.validators.classroom.addResource({
      id,
      name,
      quantity,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let classroom = await this.mongomodels.classroom.findById(id);
    if (!classroom)
      return { ok: false, code: 404, error: 'Classroom not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      classroom.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to modify this classroom',
      };
    }

    let updatedClassroom = await this.mongomodels.classroom.findOneAndUpdate(
      { _id: id, 'resources.name': name },
      { $set: { 'resources.$.quantity': quantity } },
      { new: true },
    );

    if (!updatedClassroom) {
      updatedClassroom = await this.mongomodels.classroom.findOneAndUpdate(
        { _id: id, 'resources.name': { $ne: name } },
        { $push: { resources: { name, quantity } } },
        { new: true },
      );
    }

    if (!updatedClassroom) {
      updatedClassroom = await this.mongomodels.classroom.findById(id);
    }

    return { ok: true, code: 200, classroom: updatedClassroom };
  }

  async removeResource({ __schoolAdmin, id, resourceId }) {
    const validationError = await this.validators.classroom.removeResource({
      id,
      resourceId,
    });
    if (validationError)
      return { ok: false, code: 400, errors: validationError };

    let classroom = await this.mongomodels.classroom.findById(id);
    if (!classroom)
      return { ok: false, code: 404, error: 'Classroom not found' };

    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      classroom.schoolId.toString() !== __schoolAdmin.schoolId
    ) {
      return {
        ok: false,
        code: 403,
        error: 'Unauthorized to modify this classroom',
      };
    }

    classroom = await this.mongomodels.classroom.findByIdAndUpdate(
      id,
      { $pull: { resources: { _id: resourceId } } },
      { new: true },
    );

    return { ok: true, code: 200, classroom };
  }
};
