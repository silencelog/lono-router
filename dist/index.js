"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.route = route;
exports.default = _default;
exports.HttpMethod = void 0;

var utils = _interopRequireWildcard(require("./utils"));

var _router = _interopRequireDefault(require("@koa/router"));

var _multer = _interopRequireDefault(require("@koa/multer"));

var _path = _interopRequireDefault(require("path"));

var _require = _interopRequireDefault(require("@lode/require"));

var _lodash = _interopRequireDefault(require("lodash"));

var _glob = _interopRequireDefault(require("glob"));

var _fs = _interopRequireDefault(require("fs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const cwd = process.cwd();
const upload = (0, _multer.default)();
const CONTEXT_SERVICE = Symbol('context#service'); // const bindFn = (fn, ctx) => {
//   const data = {}
//   if (typeof fn == 'function') {
//     return fn.bind(ctx)
//   } else if (typeof fn == 'object') {
//     for (const i in fn) {
//       data[i] = bindFn(fn[i], ctx)
//     }
//   }
//   return data
// }

const setCtx = (obj, ctx) => {
  for (let k in obj) {
    obj[k].ctx = ctx;
  }
};

const serviceMap = {};
const serviceSource = {}; // @Router
// @Header 请求头部 序列化
// @Get
// @Post
// @Put
// @Del
// @Patch
// @Auth 权限 promise 指向 cookie session jwt midd(404 401 auth)
// 路由path正则
// multer支持文件上传

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
/**
 * 一个路由单元
 */

exports.HttpMethod = HttpMethod;

class Route {
  constructor(opt = {}) {
    this.path = '';
    this.middleware = [];
    this.prefix = null;
    this.router = [];
  }

} // route({multipart: 'fields', data: []    multipart: 'single', data: 'aaa'})


function route(path, method, middleware = []) {
  if (typeof path === 'object') {
    const params = { ...path
    };
    method = params.method;
    middleware = params.middleware || [];
    path = params.path; // if (params.multipart) {
    //   switch (params.multipart) {
    //     case 'fields':
    //       middleware.push(upload.fields(params.data))
    //       break
    //     case 'single':
    //       middleware.push(upload.single(params.data))
    //       break
    //   }
    // }
  }

  return function (target, key, descriptor) {
    utils.assert(!!path, '@route should have at least "path" argument'); // 兼容静态方法和一般方法

    const C = target.prototype ? target.prototype : target;

    if (!C.route) {
      C.route = new Route();
    }
    /**
     * 修饰类
     */


    if (typeof target === 'function' && key === undefined && descriptor === undefined) {
      utils.assert(!method, '@route on Class should not have "method"');
      target.prototype.route.prefix = path;

      if (middleware.length > 0) {
        target.prototype.route.middleware = target.prototype.route.middleware.concat(middleware);
      }

      return;
    }
    /**
     * 修饰方法
     */


    !method && (method = 'all');
    utils.assert(!!method, '@route on method should have "method" as second argument'); // TODO 修改bind this 指向ctx 或者lode

    C.route.router.push({
      path: path,
      method: method,
      middleware: middleware,
      callback: function () {
        var _ref = _asyncToGenerator(function* (ctx, next) {
          const result = yield descriptor.value(ctx, next);
          ctx.body = ctx.body || result;
        });

        return function callback(_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }()
    });
  };
} // TODO 优化route参数支持对象


class Router {
  constructor(opt = {}) {
    this.name = 'router';
    this.isLode = true;
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

  install(lode) {
    // 加载路由文件
    (0, _require.default)(this.opt);
    (0, _require.default)({
      path: `${cwd}/src/service`,
      filter: '/**/*.js',
      onAfter: (Service, file) => {
        if (!Service.default) return;
        const c = new Service.default({
          app: lode,
          service: serviceMap,
          ctx: null,
          config: lode.$config,
          curl: lode.$curl,
          log: lode.$logger
        });
        serviceSource[file.prefix] = c;
        const path = `${file.dirs && file.dirs.length ? file.dirs.join('.') + '.' : ''}${file.prefix}`;

        _lodash.default.set(serviceMap, path, c);
      }
    });
    Object.defineProperty(lode.context, 'service', {
      value: serviceMap,
      writable: false
    });
    lode.use( /*#__PURE__*/function () {
      var _ref2 = _asyncToGenerator(function* (ctx, next) {
        setCtx(serviceSource, ctx);
        yield next();
      });

      return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
      };
    }());
    lode.use(this.router.routes()).use(this.router.allowedMethods());
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
      router[v.method](v.path, ...v.middleware, v.callback);
    });
    return router;
  }

}

function _default(...arg) {
  return new Router(...arg);
}