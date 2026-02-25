const jwt        = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const md5        = require('md5');


module.exports = class TokenManager {
    constructor({config, oyster, cache}){
        this.config              = config;
        this.oyster              = oyster;
        this.cache               = cache;
        this.longTokenExpiresIn  = '3y';
        this.shortTokenExpiresIn = '15m';
        this.userExposed         = ['v1_createShortToken'];
        this.httpExposed         = ['v1_createShortToken'];
    }

    /** 
     * short token are issue from long token 
     * short tokens are issued for 15 minutes
     * short tokens are connected to user-agent
     * short token are used on the soft logout 
     * short tokens are used for account switch 
     * short token represents a device. 
     * long token represents a single user. 
     *  
     * long token contains immutable data and long lived
     * master key must exists on any device to create short tokens
     */
    genLongToken({userId, userKey, role, schoolId}){
         const jti = nanoid();
        return jwt.sign(
            { 
                userKey, 
                userId,
                role,
                schoolId,
                jti,
            }, 
            this.config.dotEnv.LONG_TOKEN_SECRET, 
            {expiresIn: this.longTokenExpiresIn
        })
    }

    genShortToken({userId, userKey, sessionId, deviceId, role, schoolId}){
         const jti = nanoid();
        return jwt.sign(
            { userKey, userId, sessionId, deviceId, role, schoolId, jti}, 
            this.config.dotEnv.SHORT_TOKEN_SECRET, 
            {expiresIn: this.shortTokenExpiresIn
        })
    }

    _verifyToken({token, secret}){
        let decoded = null;
        try {
            decoded = jwt.verify(token, secret);
        } catch(err) { console.log(err); }
        return decoded;
    }

    verifyLongToken({token}){
        return this._verifyToken({token, secret: this.config.dotEnv.LONG_TOKEN_SECRET,})
    }
    
    verifyShortToken({token}){
        return this._verifyToken({token, secret: this.config.dotEnv.SHORT_TOKEN_SECRET,})
    }

    async revokeToken({ jti }) {
        // Add the token ID to blocklist
        // TTL bounded to 15m (15 * 60) matching Access Token default lifespan
        await this.cache.key.set({
        key: `blocked_jti:${jti}`,
        data: 'true',
        ttl: 15 * 60,
        });
    }

    async isTokenRevoked({ jti }) {
        const isRevoked = await this.cache.key.get({ key: `blocked_jti:${jti}` });
        return !!isRevoked;
    }

    /** generate shortId based on a longId */
    async v1_createShortToken({__headers, __device}){
        const token = __headers.token;
        if(!token)return {error: 'missing token '};

        let decoded = this.verifyLongToken({ token });
        if(!decoded){ return {error: 'invalid'} };

        const isRevoked = await this.isTokenRevoked({ jti: decoded.jti });
        if (isRevoked) {
            return { error: 'Token revoked' };
        }
        
        let shortToken = this.genShortToken({
            userId: decoded.userId, 
            userKey: decoded.userKey,
            role: decoded.role,
            schoolId: decoded.schoolId,
            sessionId: nanoid(),
            deviceId: md5(__device || 'unknown-device'),
        });

        return { shortToken };
    }
}