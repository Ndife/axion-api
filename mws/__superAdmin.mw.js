const { ROLES } = require('../managers/_common/constants');

module.exports = ({ meta, config, managers }) => {
  return async ({ req, res, next }) => {
    if (!req.headers.token) {
      console.log('token required but not found');
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: 'unauthorized',
      });
    }
    let decoded = null;
    try {
      decoded = managers.token.verifyShortToken({ token: req.headers.token });
      if (!decoded) {
        console.log('failed to decode-1');
        return managers.responseDispatcher.dispatch(res, {
          ok: false,
          code: 401,
          message: 'unauthorized',
        });
      }

      // Check against Oyster (Redis) blocklist
      const isRevoked = await managers.token.isTokenRevoked({
        jti: decoded.jti,
      });
      if (isRevoked) {
        return managers.responseDispatcher.dispatch(res, {
          ok: false,
          code: 401,
          message: 'token revoked',
        });
      }

      if (decoded.role !== ROLES.SUPER_ADMIN) {
        console.log('SUPERADMIN MW FORBIDDEN', decoded.role);
        return managers.responseDispatcher.dispatch(res, {
          ok: false,
          code: 403,
          message: 'forbidden',
        });
      }
    } catch (err) {
      console.log('failed to decode-2');
      return managers.responseDispatcher.dispatch(res, {
        ok: false,
        code: 401,
        message: 'unauthorized',
      });
    }

    next(decoded);
  };
};
