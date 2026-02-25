const { ROLES } = require('../../_common/constants');

module.exports = class School {
  constructor({ config, cortex, managers, validators, mongomodels } = {}) {
    this.config = config;
    this.cortex = cortex;
    this.validators = validators;
    this.mongomodels = mongomodels;
    this.tokenManager = managers.token;
    this.httpExposed = [
      'post=createSchool',
      'get=getSchools',
      'get=getSchool',
      'patch=updateSchool',
      'delete=deleteSchool',
    ];
  }

  async createSchool({ __superAdmin, name, address, phone, email }) {
    const validationError = await this.validators.school.createSchool({
      name,
      address,
      phone,
      email,
    });
    if (validationError) {
      return { ok: false, code: 400, errors: validationError };
    }

    const createdSchool = new this.mongomodels.school({
      name,
      address,
      phone,
      email,
    });

    try {
      await createdSchool.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return {
          ok: false,
          code: 400,
          error: `The ${field} '${error.keyValue[field]}' is already in use.`,
        };
      }
      return { ok: false, code: 400, error: 'Failed to create school' };
    }

    return { ok: true, code: 201, school: createdSchool };
  }

  async getSchools({ __superAdmin, page, limit, }) {
    const validationError = await this.validators.school.getSchools({ page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 10 });

    if (validationError) {
      return { ok: false, code: 400, errors: validationError };
    }

    let skip = (page - 1) * limit;
    let total = await this.mongomodels.school.countDocuments();
    let schools = await this.mongomodels.school.find().skip(skip).limit(limit);

    return {
      schools,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getSchool({ __schoolAdmin, id }) {
    const validationError = await this.validators.school.getSchool({ id });

    if (validationError) {
      return { ok: false, code: 400, errors: validationError };
    }

    let school = await this.mongomodels.school.findById(id);
    if (!school) return { ok: false, code: 404, error: 'School not found' };

    // If school admin, ensure it's their school
    if (
      __schoolAdmin.role === ROLES.SCHOOL_ADMIN &&
      school._id.toString() !== __schoolAdmin.schoolId
    ) {
      return { ok: false, code: 403, error: 'Unauthorized to view this school' };
    }

    return { school };
  }

  async updateSchool({ __superAdmin, id, name, address, phone, email }) {
    let school = await this.mongomodels.school.findById(id);
    if (!school) return { ok: false, code: 404, error: 'School not found' };

    let updateData = { name, address, phone, email };
    // Filtering undefined values
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const validationError = await this.validators.school.updateSchool({id, ...updateData});
    if (validationError) {
      return {ok: false, code: 400, errors: validationError};
    }

    school = await this.mongomodels.school.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    return { ok: true, code: 200, school };
  }

  async deleteSchool({ __superAdmin, id }) {
    const validationError = await this.validators.school.deleteSchool({ id });
    if (validationError) {
      return { ok: false, code: 400, errors: validationError };
    }

    let school = await this.mongomodels.school.findByIdAndDelete(id);
    if (!school) return { ok: false, code: 404, error: 'School not found' };
    return { ok: true, code: 200, message: 'School deleted successfully' };
  }
};
