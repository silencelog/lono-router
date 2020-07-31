import KoaRouter from '@koa/router'
import multer from '@koa/multer'
import path from 'path'
import LonoRequire from '@lono/require'
import lodash from 'lodash'
import glob from'glob'
import fs from'fs'
import {Controller, Router, All, Get, Post, Put, Del, Patch} from './decorator.js'

const cwd = process.cwd()
const upload = multer()
const CONTEXT_SERVICE = Symbol('context#service')

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

const serviceMap = {}
const serviceSource = {}
const setCtx = (obj, ctx) => {
  for (let k in obj) {
    obj[k].ctx = ctx
  }
}

class LRouter {
  constructor (opt = {}) {
    this.name = 'router'
    this.isLono = true
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
  install (app) {
    // 加载路由文件
    LonoRequire(this.opt)
    LonoRequire({
      path: `${cwd}/src/service`,
      filter: '/**/*.js',
      onAfter: (Service, file) => {
        if (!Service.default) return
        const c = new (Service.default)({
          app: app,
          service: serviceMap,
          ctx: null,
          config: app.$config,
          curl: app.$curl,
          log: app.$logger
        })
        serviceSource[file.prefix] = c
        const path = `${file.dirs && file.dirs.length ? file.dirs.join('.') + '.' : ''}${file.prefix}`
        lodash.set(serviceMap, path, c)
      }
    })
    Object.defineProperty(app.context, 'service', {
      value: serviceMap,
      writable: false
    })
    app.use(async (ctx, next) => {
      setCtx(serviceSource, ctx)
      await next()
    })
    app.use(this.router.routes()).use(this.router.allowedMethods())
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
      // TODO 考虑callback的this指向需不需要优化
      router[v.method](v.path, ...v.middleware, v.callback)
    })
    return router
  }
}

export default function (...arg) {
  return new LRouter(...arg)
}

export {Controller, Router, All, Get, Post, Put, Del, Patch}
