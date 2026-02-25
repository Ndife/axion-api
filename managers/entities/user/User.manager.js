const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const {ROLES} = require('../../_common/constants');
module.exports = class User { 

    constructor({config, cortex, managers, validators, mongomodels }={}){
        this.config              = config;
        this.cortex              = cortex;
        this.validators          = validators; 
        this.mongomodels         = mongomodels;
        this.tokenManager        = managers.token;
        this.usersCollection     = "users";
        this.userExposed         = ['createUser'];
        this.httpExposed         = ['createUser', 'loginUser', 'logoutUser'];
    }

  async createUser({ username, email, password, schoolId, role = ROLES.SCHOOL_ADMIN }) {
    let result = await this.validators.user.createUser({
      username,
      email,
      password,
      schoolId,
      role,
    });
    if (result) return result;

    const hashedPassword = await bcrypt.hash(password, 10);

    let createdUser = new this.mongomodels.user({
      username,
      email,
      password: hashedPassword,
      schoolId,
      role,
    });

    try {
      await createdUser.save();
    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return {
          error: `The ${field} '${error.keyValue[field]}' is already in use.`,
        };
      }
      return { error: 'Failed to create user' };
    }

    let longToken = this.tokenManager.genLongToken({
      userId: createdUser._id,
      userKey: createdUser.username,
      role: createdUser.role,
      schoolId: createdUser.schoolId || 'N/A',
    });

    let shortToken = this.tokenManager.genShortToken({
      userId: createdUser._id,
      userKey: createdUser.username,
      sessionId: 'session-' + nanoid(),
      deviceId: 'device-create',
      role: createdUser.role,
      schoolId: createdUser.schoolId || 'N/A',
    });

    return {
      user: {
        _id: createdUser._id,
        username: createdUser.username,
        email: createdUser.email,
        role: createdUser.role,
        schoolId: createdUser.schoolId,
      },
      longToken,
      shortToken,
    };
  }

  async loginUser({ email, password }) {
    let result = await this.validators.user.loginUser({ email, password });
    if (result) return result;

    const errorMsg = { error: 'Invalid email or password' };
    if (!email || !password) return errorMsg;

    let user = await this.mongomodels.user.findOne({ email });
    if (!user) return errorMsg;

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) return errorMsg;

    let longToken = this.tokenManager.genLongToken({
      userId: user._id,
      userKey: user.username,
      role: user.role,
      schoolId: user.schoolId || 'N/A',
    });

    let shortToken = this.tokenManager.genShortToken({
      userId: user._id,
      userKey: user.username,
      sessionId: 'session-' + nanoid(),
      deviceId: 'device-login',
      role: user.role,
      schoolId: user.schoolId || 'N/A',
    });

    return {
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
      },
      longToken,
      shortToken,
    };
  }

  async logoutUser({ token }) {
    if (!token) {
      return { error: 'Token missing' };
    }

    const decoded = this.tokenManager.verifyShortToken({ token });
    if (!decoded) {
      return { error: 'Invalid token' };
    }

    await this.tokenManager.revokeToken({ jti: decoded.jti });
    return { success: true, message: 'Logged out successfully' };
  }

}
