const emojis = require('../../public/emojis.data.json');
const { ROLE_VALUES } = require('./constants');

module.exports = {
    id: {
        path: "id",
        type: "string",
        regex: /^[a-fA-F0-9]{24}$/,
    },
    name: {
      path: 'name',
      type: 'string',
      length: { min: 3, max: 100 },
    },
    username: {
        path: 'username',
        type: 'string',
        length: {min: 3, max: 20},
    },
    password: {
        path: 'password',
        type: 'string',
        length: {min: 8, max: 100},
    },
    role: {
        path: 'role',
        type: 'string',
        length: { min: 5, max: 20 },
        oneOf: ROLE_VALUES,
    },
    schoolId: {
        path: 'schoolId',
        type: 'string',
        length: { min: 24, max: 24 },
        regex: /^[a-fA-F0-9]{24}$/,
    },
    page: {
        path: 'page',
        type: 'number',
        length: { min: 1, max: 100 },
    },
    limit: {
        path: 'limit',
        type: 'number',
        length: { min: 1, max: 100 },
    },
    title: {
        path: 'title',
        type: 'string',
        length: {min: 3, max: 300}
    },
    label: {
        path: 'label',
        type: 'string',
        length: {min: 3, max: 100}
    },
    shortDesc: {
        path: 'desc',
        type: 'string',
        length: {min:3, max: 300}
    },
    longDesc: {
        path: 'desc',
        type: 'string',
        length: {min:3, max: 2000}
    },
    url: {
        path: 'url',
        type: 'string',
        length: {min: 9, max: 300},
    },
    emoji: {
        path: 'emoji',
        type: 'Array',
        items: {
            type: 'string',
            length: {min: 1, max: 10},
            oneOf: emojis.value,
        }
    },
    price: {
        path: 'price',
        type: 'number',
    },
    avatar: {
        path: 'avatar',
        type: 'string',
        length: {min: 8, max: 100},
    },
    text: {
        type: 'String',
        length: {min: 3, max:15},
    },
    longText: {
        type: 'String',
        length: {min: 3, max:250},
    },
    paragraph: {
        type: 'String',
        length: {min: 3, max:10000},
    },
    phone: {
        type: 'String',
        length: 13,
    },
    email: {
        path: 'email',
        type: 'String',
        regex: /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    },
    number: {
        type: 'Number',
        length: {min: 1, max:6},
    },
    arrayOfStrings: {
        type: 'Array',
        items: {
            type: 'String',
            length: { min: 3, max: 100}
        }
    },
    obj: {
        type: 'Object',
    },
    bool: {
        type: 'Boolean',
    },
}