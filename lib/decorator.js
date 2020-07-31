import * as utils from './utils'

/**
 * 路由单元
 */
class Route {
  constructor (opt = {}) {
    this.path = ''
    this.middleware = []
    this.prefix = null
    this.router = []
    this.file = null
  }
}

function setController (target, key, descriptor, params = {}) {
  utils.assert(!!params.path, '@Controller should have at least "path" argument')
  // 兼容静态方法和一般方法
  const C = target.prototype ? target.prototype : target
  if (!C.route) {
    C.route = new Route()
  }
  if (typeof target === 'function' && key === undefined && descriptor === undefined) {
    target.prototype.route.prefix = params.path
    if (params.middleware.length > 0) {
      target.prototype.route.middleware = target.prototype.route.middleware.concat(params.middleware)
    }
  }
}

function setRouter (target, key, descriptor, params) {
  utils.assert(!!params.path, '@Router should have at least "path" argument')
  const C = target.prototype ? target.prototype : target
  if (!C.route) {
    C.route = new Route()
  }
  !params.method && (params.method = 'all')
  utils.assert(!!params.method, '@Router on method should have "method" as second argument')
  C.route.router.push({
    path: params.path,
    method: params.method,
    file: params.file,
    middleware: params.middleware,
    callback: async (ctx , next) => {
      const result = await descriptor.value(ctx, next)
      ctx.body = ctx.body || result
    }
  })
}

/**
 * 控制器修饰器
 */
export function Controller (path, middleware) {
  const params = {
    path,
    middleware
  }
  return function (target, key, descriptor) {
    setController.call(this, target, key, descriptor, params)
  }
}

/**
 * 路由修饰器
 */
export function Router (path, method, middleware = []) {
  const params = typeof path === 'object' ? {...path} : {
    path,
    method,
    middleware
  }
  return function (target, key, descriptor) {
    setRouter.call(this, target, key, descriptor, params)
  }
}

export function All (path, middleware) {
  return Router(path, 'all', middleware)
}

export function Get (path, middleware) {
  return Router(path, 'get', middleware)
}

export function Post (path, middleware) {
  return Router(path, 'post', middleware)
}

export function Put (path, middleware) {
  return Router(path, 'put', middleware)
}

export function Del (path, middleware) {
  return Router(path, 'del', middleware)
}

export function Patch (path, middleware) {
  return Router(path, 'path', middleware)
}

export function Auth () {
}

export function File () {
}

export function Header () {
}