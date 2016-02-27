'use strict';

var _ = require('lodash');
var util = require('util');

module.exports = {
    toPairs: function (dictionary) {
        var pairs = [];

        _.forIn(dictionary, function (value, key) {
            var json = JSON.stringify(value);
            var pair = util.format('%s=%s', key, json);
            pairs.push(pair);
        });

        return pairs.join(' ');
    }
};