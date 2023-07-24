'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');
var validator = require('../helpers/validator');

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
// Axios构造函数
// Axios原型上总共有九个方法 
// - request
// - getUri
// - delete、gett、head、options
// - post、put、patch
function Axios(instanceConfig) {
  // 初始化默认配置.default中存储的就是默认配置
  this.defaults = instanceConfig;
  // 请求拦截器和响应拦截器
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  // 兼容化处理axios的调用方式
  // 1、axios('xxx/path', {...params})
  // 2、axios({...config})
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  // 合并配置项
  config = mergeConfig(this.defaults, config);

  // methods转小写
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  // }

  // 忽略，可以不用考虑
  // var transitional = config.transitional;
  // if (transitional !== undefined) {
  //   validator.assertOptions(transitional, {
  //     silentJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
  //     forcedJSONParsing: validators.transitional(validators.boolean, '1.0.0'),
  //     clarifyTimeoutError: validators.transitional(validators.boolean, '1.0.0')
  //   }, false);
  // }

  // 请求拦截队列
  var requestInterceptorChain = [];
  // 同步请求拦截器
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    // synchronousRequestInterceptors = false
    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    // 往队列头部放一对回调函数，成功-失败
    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  // 相应拦截队列
  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    // 往队列尾部放一对回调函数，成功-失败
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  // 默认都是异步拦截
  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    // 合并队列
    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    // 合并之后队列如下
    // [请求拦截n，... ,  请求拦截0，dispatchRequest, undefined， 相应拦截0，……响应拦截n]

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  // 同步拦截需要都单独指定
  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
