"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
Object.defineProperty(exports, "Controller", {
  enumerable: true,
  get: function () {
    return _decorator.Controller;
  }
});
Object.defineProperty(exports, "Router", {
  enumerable: true,
  get: function () {
    return _decorator.Router;
  }
});
Object.defineProperty(exports, "Get", {
  enumerable: true,
  get: function () {
    return _decorator.Get;
  }
});
Object.defineProperty(exports, "Post", {
  enumerable: true,
  get: function () {
    return _decorator.Post;
  }
});
Object.defineProperty(exports, "Put", {
  enumerable: true,
  get: function () {
    return _decorator.Put;
  }
});
Object.defineProperty(exports, "Del", {
  enumerable: true,
  get: function () {
    return _decorator.Del;
  }
});
Object.defineProperty(exports, "Patch", {
  enumerable: true,
  get: function () {
    return _decorator.Patch;
  }
});
exports.HttpMethod = void 0;

var _router = _interopRequireDefault(require("@koa/router"));

var _multer = _interopRequireDefault(require("@koa/multer"));

var _path = _interopRequireDefault(require("path"));

var _require = _interopRequireDefault(require("@lono/require"));

var _lodash = _interopRequireDefault(require("lodash"));

var _glob = _interopRequireDefault(require("glob"));

var _fs = _interopRequireDefault(require("fs"));

var _decorator = require("./decorator.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const cwd = process.cwd();
const upload = (0, _multer.default)();
const CONTEXT_SERVICE = Symbol('context#service');
const HttpMethod = {
  ALL: 'all',
  HEAD: 'head',
  OPTIONS: 'optios',
  GET: 'get',
  PUT: 'put',
  PATCH: 'patch',
  POST: 'post',
  DELETE: 'delete',
  DEL: 'del'
};
exports.HttpMethod = HttpMethod;
const serviceMap = {};
const serviceSource = {};

const setCtx = (obj, ctx) => {
  for (let k in obj) {
    obj[k].ctx = ctx;
  }
};

class LRouter {
  constructor(opt = {}) {
    this.name = 'router';
    this.isLono = true;
    this.routes = [];
    this.opt = {
      path: opt.path,
      filter: '/**/*.js',
      onAfter: (Controller, file) => {
        if (!Controller.default) return;
        const c = new Controller.default();

        if (file.dirs && file.dirs.length) {
          c.route.prefix = '/' + file.dirs.join('/') + c.route.prefix;
        }

        const router = this.createKoaRouter(c.route);
        this.router.use(router.routes());
      },
      ...opt
    };
    this.router = new _router.default(opt);
  }

  install(app) {
    // 加载路由文件
    (0, _require.default)(this.opt);
    (0, _require.default)({
      path: `${cwd}/src/service`,
      filter: '/**/*.js',
      onAfter: (Service, file) => {
        if (!Service.default) return;
        const c = new Service.default({
          app: app,
          service: serviceMap,
          ctx: null,
          config: app.$config,
          curl: app.$curl,
          log: app.$logger
        });
        serviceSource[file.prefix] = c;
        const path = `${file.dirs && file.dirs.length ? file.dirs.join('.') + '.' : ''}${file.prefix}`;

        _lodash.default.set(serviceMap, path, c);
      }
    });
    Object.defineProperty(app.context, 'service', {
      value: serviceMap,
      writable: false
    });
    app.use( /*#__PURE__*/function () {
      var _ref = _asyncToGenerator(function* (ctx, next) {
        setCtx(serviceSource, ctx);
        yield next();
      });

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }());
    app.use(this.router.routes()).use(this.router.allowedMethods());
  }

  createKoaRouter(route) {
    const router = new _router.default();

    if (route.prefix) {
      router.prefix(route.prefix);
    }

    if (route.middleware) {
      router.use(...route.middleware);
    }

    route.router.forEach((v, i) => {
      // TODO 考虑callback的this指向需不需要优化
      router[v.method](v.path, ...v.middleware, v.callback);
    });
    return router;
  }

}

function _default(...arg) {
  return new LRouter(...arg);
}