'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
*/
function createInstance(defaultConfig) {
  // 创建Axios构造函数的实例
  var context = new Axios(defaultConfig);
  // 把Axios原型上的request方法转移到instance上，同时函数的this指向Axios的实例context
  var instance = bind(Axios.prototype.request, context);

  //  把Axios原型上其他方法转移到instance上，同时执行函数的this指向Axios的实例context
  utils.extend(instance, Axios.prototype, context);

  // 再把context上的属性和方法拷贝到instance上
  utils.extend(instance, context);

  // 到此为止
  // instance既是一个函数-Axios.prototype.request
  // 还是一个对象。instance对象上有Axios原型上的方法，也有context上的属性和方法

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// 创建一个axios实例，对外暴露。既是对象，也是函数
var axios = createInstance(defaults);

// 把Axios构造函数也对外暴露
axios.Axios = Axios;

axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// all方法，完全等同于Promise.all
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
