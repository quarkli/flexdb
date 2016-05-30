/*
@license
Copyright (c) 2016 Quark Li. All rights reserved.
This code may only be used under the MIT license.
*/

(function() {
  'use strict';

  function FlexTools() {
    var me = this;

    // Convert a path string "tables/test/key1" to ["tables"]["test"]["key1"]
    // Arguments:
    // path - path string as the above example
    this.convertPath = convertPath;
    function convertPath(path) {
      return '["' + path.split('/').join('"]["') + '"]';
    }

    // Create an object path, like ["path0"]["path1"]["key"], from a node object
    // Arguments:
    // node - a node object is {k: <node_key>, p: <path_array>, v: <node_value>}
    this.buildPathFromNode = buildPathFromNode;
    function buildPathFromNode(node) {
      var path = JSON.parse(JSON.stringify(node));
      path.p.push(path.k);
      path = path.p.join('"]["');
      return '["' + path + '"]';
    }

    // calculate average value of a specific path in a object array data
    // Arguments:
    //  data - source data of object array
    //  path - the specific path to be calculated
    //  start - the start index of range of array to be calculated, starts from 1, default: 1
    //  len - the length of range of array from start index to be calculated, default: array size
    //  incEmpty - if a path has no value, whether to count it in as average divider, default: true
    this.avg = avg;
    function avg(data, path, start, len, incEmpty) {
      start = start || 1;
      len = len || data.length;
      incEmpty = incEmpty  === undefined ? true : incEmpty;

      var count = len;
      if (!incEmpty) {
        count = data.reduce(function(e1, e2, i){
          if (i < start - 1 || i > start + len - 2) return e1;
          return eval('e2' + path).length || isNaN(eval('e2' + path)) ? ++e1 : e1;
        }, 0);
      }
      return sum(data, path, start, len) / count;
    }

    // calculate summarization of a specific path in a object array data
    // Arguments:
    //  data - source data of object array
    //  path - the specific path to be calculated
    //  start - the start index of range of array to be calculated, starts from 1, default: 1
    //  len - the length of range of array from start index to be calculated, default: array size
    this.sum = sum;
    function sum(data, path, start, len) {
      start = start || 1;
      len = len || data.length;

      return data.reduce(function(e1, e2, i){
        // console.log(i, (i < start || i > end), e1)
        if (i < start - 1 || i > start + len - 2) return e1;
        return e1 + (isNaN(eval('e2' + path)) ? 0 : 1 * eval('e2' + path));
      }, 0);
    }

    // sort an object array data by specific path
    // Arguments:
    //  data - source data of object array
    //  path - the specific path to be sorted
    //  ascending - the sort order is ascending or descending, default ascending
    this.sort = sort;
    function sort(data, path, ascending) {
      ascending = ascending  === undefined ? true : ascending;

      data.sort(function(a,b){
        // compare numbers
        var aval = eval('a' + path);
        var bval = eval('b' + path);
        if (!isNaN(aval) && !isNaN(bval)) {
          return ascending ? aval - bval : bval　- aval;
        }
        else {
          var ad = (new Date(aval)).valueOf();
          var bd = (new Date(bval)).valueOf();
          if (isNaN(ad) || isNaN(bd)) {
            return aval + '' > bval + '' == ascending ? 1 : -1;
          }
          else {
            return ascending ? ad - bd : bd - ad;
          }
        }
      });
    }

    // filter an object array data by specific query statement, filtered objects
    // will be returned in a callback function
    // Arguments:
    //  data - source data of object array
    //  query - query statement
    //  cb - callback function with the prototype =>
    //    cb(filteredObjectArray)
    this.filter = filter;
    function filter(data, query, cb) {
      var unmatched = [];
      var filtered = []
      var statement = query.path;
      if (isNaN(query.value)) query.value = '"' + query.value +'"';

      switch (query.term) {
        case 'lt':
          statement += '<' + query.value;
          break;
        case 'gt':
          statement += '>' + query.value;
          break;
        case 'eq':
          statement += '==' + query.value;
          break;
        case 'neq':
          statement += '!=' + query.value;
          break;
        case 'leq':
          statement += '<=' + query.value;
          break;
        case 'geq':
          statement += '>=' + query.value;
          break;
        case 'match':
          statement += '.match("' + query.value + '")';
          break;
        case 'like':
          statement += '.toLowerCase().match(("' + query.value + '").toLowerCase())';
          break;
      }

      data.forEach(function(e, i, o){
        if (!eval('e' + statement)) {
          unmatched.splice(0, 0, i);
        }
      });

      unmatched.forEach(function(e){
        filtered.splice(0, 0, data.splice(e, 1)[0]);
      });

      if (cb) cb(filtered);
    }

    // Recursive iteration on a Javascript Object with self/cross-reference protection
    // Arguments:
    //  obj - Object to be iterated
    //  cb - callback function with the prototype =>
    //    cb(currentNode, currentKey, currentPath, object)
    //  leafOnly - iteration on leaf nodes only, if TRUE, callback will be skipped
    //    when a node is an Object, if FALSE, callback will be called on all nodes.
    //  arrayAsObj - if TRUE, iterator treat Array as an Object and iterate through
    //    each Array node, if FALSE, iterator treat Array as value
    //  path - internal use for recursive tracking, should not be set by application call.
    //  cache - internal use for recursive tracking, should not be set by application call.
    this.objectNodeIterator = objectNodeIterator;
    function objectNodeIterator(obj, cb, leafOnly, arrayAsObj, path, cache) {
      leafOnly = leafOnly === undefined ? true : leafOnly;
      arrayAsObj = arrayAsObj === undefined ? false : arrayAsObj;
      path = path || [];

      if (typeof obj == 'object' && (Array.isArray(obj) ? arrayAsObj : true)) {
        cache = cache || [obj];
        Object.keys(obj).forEach(function(key){
          if (cache.indexOf(obj[key]) < 0) {
            var p = path.slice();
            if (typeof obj[key] !== 'object' || (Array.isArray(obj[key]) && !arrayAsObj)) {
              if (typeof cb == 'function') cb(obj[key], key, p, obj);
            }
            else {
              if (!leafOnly && typeof cb == 'function') cb(obj[key], key, p, obj);
              p.push(key);
              cache.push(obj[key]);
              objectNodeIterator(obj[key], cb, leafOnly, arrayAsObj, p, cache);
            }
          }
        });
      }
    }

    // Convert a JSON data to an Array data
    // example:
    // json = {
    //   a: 1,
    //   b: 2,
    //   c: {
    //     d: 'x',
    //     e: 'y'
    //   }
    // }
    // converts to:
    // array = [
    //  {key: 'a', value: 1},
    //  {key: 'b', value: 2},
    //  {key: 'c', value: [
    //     {key: 'd', value: 'x'},
    //     {key: 'e', value: 'y'}
    //  ]}
    // ]
    // Arguments:
    //   jsn - source JSON data
    // Return:
    //   Converted Array data
    this.json2array = json2array;
    function json2array(jsn) {
      var ret = [];

      function findNode(p, a) {
        var realNode = null;
        var rootNode = a.find(function(e){
          if (Array.isArray(e.v)) {
            if (e.v.length) realNode = findNode(p, e.v);
            if (!realNode) {
              var path = e.p.slice();
              path.push(e.k);
              if (p.join('-') == path.join('-')) return true;
            }
            return false;
          }
        });
        return realNode || rootNode;
      }

      flexTools.objectNodeIterator(jsn, function(e,k,p,o){
        var path = p.slice();
        var node = findNode(path, ret);
        if (node) {
          node.v.push({p: path, k: k, v: typeof e == 'object' ? [] : e});
        }
        else {
          ret.push({p: path, k: k, v: typeof e == 'object' ? [] : e});
        }
      }, false, true);
      return ret;
    }

    // Convert a Array data to an JSON data, the reverse function of json2array
    this.array2json = array2json;
    function array2json(ary) {
      function iter(ary, obj) {
        ary.forEach(function(e){
          if (Array.isArray(e.v)) {
            obj[e.k] = {};
            iter(e.v, obj[e.k]);
          }
          else {
            obj[e.k] = e.v;
          }
        });
        return obj;
      }
      return iter(ary, {});
    }

    // syntaxParser, will parse a statement matched the following rules.
    // Rule:
    // 1. =[statement] - only statement wiithin =[] will be parsed
    // 2. AVG(table/field), SUM(table/field) - resolve AVG() and SUM() function first
    //    AVG() and SUM() will be evaluated first and replaced with evaluated result
    // 3. __table/field__ - field value will be looked for and replaced
    // 4. Arithmetic statement will be evaluated last.
    this.syntaxParser = syntaxParser;
    function syntaxParser(statement, refData) {
      var ret = statement;
      if (ret.match(/=\[.*\]$/)) {
        ret = ret.slice(2, -1);
        ret = parseFunc('SUM', ret);
        ret = parseFunc('AVG', ret);
        ret = evalValue(ret, refData);
      }
      return ret;
    }

    function parseFunc(func, statement) {
      if (statement.indexOf(func + '(') < 0) return statement;

      var breakdown = [];

      var slice = statement.split(func + '(');
      breakdown.push(slice[0]);
      slice = slice.slice(1).join(func + '(');

      slice = slice.split(')');
      var path = slice[0].replace(/__/g, '').split('/');
      var table = path[0];
      path.splice(1, 0, 'data');
      path = convertPath(path.slice(1).join('/'));
      var result = eval(func.toLowerCase() + '(app.getTable("' + table + '"), \'' + path + '\')');
      breakdown.push(result);
      slice = slice.slice(1).join(')');

      if(slice && slice.length) {
        if (slice.indexOf(func + '(') > -1) {
          breakdown.push(parseFunc(func, slice));
        }
        else {
          breakdown.push(slice);
        }
      }

      return breakdown.join('');
    }

    this.evalDocument = evalDocument;
    function evalDocument(evalDoc, refDoc) {
      var obj = {};
      flexTools.objectNodeIterator(evalDoc, function(e,k,p,o){
        var path = p.slice();
        path.push(k);
        path = flexTools.convertPath(path.join('/'));

        if (typeof e == 'object') {
          eval('obj' + path + '= {}');
        }
        else {
          var ret = syntaxParser(e, refDoc);
          eval('obj' + path + '= "' + ret + '"');
        }
      });

      return obj;
    }
    // function evalDocument(evalDoc, refDoc) {
    //   var ret = {};
    //   src = src || form2json();
    //   objectNodeIterator(src, function(e,k,p){
    //     var path = p.map(function(a,b){return '["'+a+'"]'}).reduce(function(a,b){return a+b}, '');
    //     var srcnode = eval('src' + path);
    //     var retnode = eval('ret' + path);
    //     if (typeof srcnode[k] == 'object') {
    //       retnode[k] = {};
    //     }
    //     else {
    //       retnode[k] = evalValue(srcnode[k], refTable);
    //     }
    // }, false);
    //   $('pre').html(JSON.stringify(ret,null,4));
    //   return ret;
    // }

    this.evalValue = evalValue;
    function evalValue(val, refObj) {
      try {
        var statement = val.split('__');
        if (statement.length > 1) statement = statement.map(function(e){
          var path = e.split('/').slice(1).join('/');
          path = convertPath(path);

          var ret = getValue(path, refObj);
          return ret ? ret : e;
        });
        statement = statement.join('');
        var ret = eval(statement);
        if (!isNaN(ret)) ret = parseFloat(ret).toFixed(2);
        return ret;
      }
      catch (e) {
        return val;
      }
    }

    this.getValue = getValue;
    function getValue(path, obj) {
      return eval('obj' + path);
    }
    /* old implementation
    function getValue(value, data) {
      var obj, key;

      // Search from a data source
      // i.e. getValue('apple', foods), foods = {vegi: {carrot: 1}, fruit: {apple: 2, banana: 1}}
      // return => 2
      if (data) {
        obj = data;
        key = value;
      }
      else {
        try {
          // getValue('doc["sectA"]["sectB"]["fieldA"]')
          // converts to => tables.doc["sectA"]["sectB"]["fieldA"]
          var val = eval('tables.' + value);
          if (val) return val;
        }
        catch (e) {}

        try {
          // getValue('src.val') = getValue('val', tables.src)
          obj = eval('tables.' + value.split('.')[0]);
          key = value.split('.')[1];
          if (!obj) return null;
        }
        catch (e) {
          return null;
        }
      }

      if (obj[key]) {
        return obj[key];
      }
      else {
        var ret = null;
        Object.keys(obj).forEach(k=>{
          if (!ret && typeof obj[k] == 'object') {
            ret = getValue(key, obj[k]);
          }
        });
        return ret;
      }
    }
    */
  }

  window.flexTools = window.flexTools || new FlexTools();

  if(!(window.flexTools instanceof FlexTools)) console.error("flexTools init failed")
})();
