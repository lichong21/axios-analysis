'use strict';

var utils = require('../utils');

// 规范化Http请求头部分的名称
// 比如：将content-type转换为Content-Type
module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};
