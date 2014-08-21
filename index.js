var path = require('path');
var fs = require('fs');

var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = require('vinyl');
var async = require('async');
var glob = require('glob');

const PLUGIN_NAME = 'gulp-i18next-translate';


var translate = function (opt) {
  if (!opt.locale) {
    throw new Error('you should passe locale option');
  }

  var regex     = opt.parser;
  var functions = opt.functions || ['t', '__'];

  var fnPattern = '(?:' + functions.join( ')|(?:' ).replace( '.', '\\.' ) + ')';
  var pattern = '(?:'+fnPattern+')(?:\\(|\\s)\\s*(?:(?:\'((?:(?:\\\\\')?[^\']+)+[^\\\\])\')|(?:"((?:(?:\\\\")?[^"]+)+[^\\\\])"))\\)';
  var basicRegex = new RegExp( regex || pattern, 'g' );

  var locales = {};

  glob.sync(opt.locale).forEach (function(localeFilePath) {
    var locale = localeFilePath.split('/')[1];
    locales[locale] = JSON.parse(fs.readFileSync(localeFilePath).toString('utf8'));
  });

  var transform = function (file, enc, callback) {
    if (file.isNull()) {
      return callback();
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      return callback();
    }


    for (var locale in locales) {
      var text = file.contents.toString('utf8');

      text = text.replace(basicRegex, function(match, word) {
        var translated = locales[locale][word] || word;
        return translated;
      });

      var translatedFile = new File({
        cwd: file.cwd,
        base: file.base,
        path: path.join(file.base, locale, file.relative),
        contents: new Buffer(text)
      });

      this.push(translatedFile);
    }

    callback();
  };


  return through.obj(transform);
};


module.exports = translate;
