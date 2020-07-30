import * as utils from './utils'
import KoaRouter from '@koa/router'
import multer from '@koa/multer'
import path from 'path'
import LonoRequire from '@lono/require'
import lodash from 'lodash'
import glob from'glob'
import fs from'fs'

const cwd = process.cwd()
const upload = multer()
const CONTEXT_SERVICE = Symbol('context#service')

// const bindFn = (fn, ctx) => {
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
    obj[k].ctx = ctx
  }
}

const serviceMap = {}
const serviceSource = {}

// @Router
// @Header 请求头部 序列化
// @Get
// @Post
// @Put
// @Del
// @Patch
// @Auth 权限 promise 指向 cookie session jwt midd(404 401 auth)
// 路由path正则
// multer支持文件上传
export const HttpMethod = {
  ALL: 'all',
  HEAD: 'head',
  OPTIONS: 'optios',
  GET: 'get',
  PUT: 'put',
  PATCH: 'patch',
  POST: 'post',
  DELETE: 'delete',
  DEL: 'del'
}

/**
 * 一个路由单元
 */
class Route {
  constructor (opt = {}) {
    this.path = ''
    this.middleware = []
    this.prefix = null
    this.router = []
  }
}

// route({multipart: 'fields', data: []    multipart: 'single', data: 'aaa'})
export function route (path, method, middleware=[]) {
  if (typeof path === 'object') {
    const params = {...path}
    method = params.method
    middleware = params.middleware || []
    path = params.path
    // if (params.multipart) {
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
    utils.assert(!!path, '@route should have at least "path" argument')

    // 兼容静态方法和一般方法
    const C = target.prototype ? target.prototype : target
    if (!C.route) {
      C.route = new Route()
    }
    /**
     * 修饰类
     */
    if (typeof target === 'function' && key === undefined && descriptor === undefined) {
      utils.assert(!method, '@route on Class should not have "method"')
      target.prototype.route.prefix = path
      if (middleware.length > 0) {
        target.prototype.route.middleware = target.prototype.route.middleware.concat(middleware)
      }
      return
    }

    /**
     * 修饰方法
     */
    (!method) && (method = 'all')
    utils.assert(!!method, '@route on method should have "method" as second argument')
    // TODO 修改bind this 指向ctx 或者lode
    C.route.router.push({
      path: path,
      method: method,
      middleware: middleware,
      callback: async (ctx , next) => {
        const result = await descriptor.value(ctx, next)
        ctx.body = ctx.body || result
      }
    })
  }
}

// TODO 优化route参数支持对象
class Router {
  constructor (opt = {}) {
    this.name = 'router'
    this.isLode = true
    this.routes = []
    this.opt = {
      path: opt.path,
      filter: '/**/*.js',
      onAfter: (Controller, file) => {
        if (!Controller.default) return
        const c = new (Controller.default)()
        if (file.dirs && file.dirs.length) {
          c.route.prefix = '/' + file.dirs.join('/') + c.route.prefix
        }
        const router = this.createKoaRouter(c.route)
        this.router.use(router.routes())
      },
      ...opt
    }
    this.router = new KoaRouter(opt)
  }
  install (lode) {
    // 加载路由文件
    LonoRequire(this.opt)
    LonoRequire({
      path: `${cwd}/src/service`,
      filter: '/**/*.js',
      onAfter: (Service, file) => {
        if (!Service.default) return
        const c = new (Service.default)({
          app: lode,
          service: serviceMap,
          ctx: null,
          config: lode.$config,
          curl: lode.$curl,
          log: lode.$logger
        })
        serviceSource[file.prefix] = c
        const path = `${file.dirs && file.dirs.length ? file.dirs.join('.') + '.' : ''}${file.prefix}`
        lodash.set(serviceMap, path, c)
      }
    })
    Object.defineProperty(lode.context, 'service', {
      value: serviceMap,
      writable: false
    })
    lode.use(async (ctx, next) => {
      setCtx(serviceSource, ctx)
      await next()
    })
    lode.use(this.router.routes()).use(this.router.allowedMethods())
  }
  createKoaRouter (route) {
    const router = new KoaRouter()
    if (route.prefix) {
      router.prefix(route.prefix)
    }
    if (route.middleware) {
      router.use(...route.middleware)
    }
    route.router.forEach((v, i) => {
      router[v.method](v.path, ...v.middleware, v.callback)
    })
    return router
  }
}

export default function (...arg) {
  return new Router(...arg)
}
