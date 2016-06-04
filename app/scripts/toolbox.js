/*
@license
Copyright (c) 2016 Quark Li. All rights reserved.
This code may only be used under the MIT license.
*/

/*
* o = object:
  a javascript object which may contain nested object.
  example:
  o = {
    key1: value1,
    key2: {
      key3: value 3
    },
    ...
  }

* oa = object-array:
  a conversion of object presented in array for easier iteration,
  an object node (key/value pair) will be convert to a oa-node,
  noted, in k=key, p=path, v=value, to keep tracking its original node information,
  and nested object will be nested array in oa-node value.
  example:
  oa = [
    {k: key1, p: [], v: value1},
    {k: key2: p: [], v: [
      {k: key3, p: [key2], v: value3}
    ]}
  ]

* oa-node:
  a representation of an object node in a oa conversion.
  k: node key
  p: node path, array of nested object's parent keys
  v: value, if node was an object, it will be converted to oa-node
  example:
  oa-node = {
    k: key,
    p: [node-path1, node-path2, ...],
    v: value
  }

* aob - array of object:
  a array of objects which are in the same object schema.
  example:
  [
    {name: 'Sam', age: 20},
    {name: 'Peter', age: 19},
    ...
  ]

* node path: an object node's path in the format of ["a"]["b"]["c"]

* node-ref = node reference:
  a node-ref noted as __object/node_path__, starts and ends with __ (double under-score)
  , which is used as a reference to an object node and can be evaluated to its node value.

* evaluation statement: an string start with = (equal sign) will be evaluated and
  converted aob functions and node-ref withing the string to the functions execution
  result or node value of reference object.

*/
(function() {
  'use strict';

  function FlexTools() {
    var me = this;

    // Convert a path string "a/b/c" to ["a"]["b"]["c"]
    // Arguments: path string as in the above example
    this.convertPath = convertPath;
    function convertPath(path) {
      return '["' + path.split('/').join('"]["') + '"]';
    }

    // Create a path from a node, like ["path0"]["path1"]["key"], from a node object
    // Arguments: oa-node
    this.buildPathFromNode = buildPathFromNode;
    function buildPathFromNode(node) {
      var path = JSON.parse(JSON.stringify(node));
      path.p.push(path.k);
      path = path.p.join('"]["');
      return '["' + path + '"]';
    }

    // calculate average value of a specific node in an array of object (aob)
    // Arguments:
    //  aob - source array of object
    //  path - the specific node path to be calculated
    //  start - the start index of range of aob to be calculated, range index starts from 1, default: 1
    //  len - the length of range of aob from start index to be calculated, default: aob size
    //  incEmpty - if a path has no value, whether to count it in as average divider, default: true
    this.avg = avg;
    function avg(aob, path, start, len, incEmpty) {
      start = start || 1;
      len = len || aob.length;
      incEmpty = incEmpty  === undefined ? true : incEmpty;

      var count = len;
      if (!incEmpty) {
        count = aob.reduce(function(e1, e2, i){
          if (i < start - 1 || i > start + len - 2) return e1;
          try {
            return eval('e2' + path).length || isNaN(eval('e2' + path)) ? ++e1 : e1;
          }
          catch(e) {
            return -1;
          }
        }, 0);
      }
      return sum(aob, path, start, len) / count;
    }

    // calculate summarization of a specific node in an array of object (aob)
    // Arguments:
    //  aob - source array of object
    //  path - the specific node path to be calculated
    //  start - the start index of range of aob to be calculated, range index starts from 1, default: 1
    //  len - the length of range of aob from start index to be calculated, default: array size
    this.sum = sum;
    function sum(aob, path, start, len) {
      start = start || 1;
      len = len || aob.length;

      return aob.reduce(function(e1, e2, i){
        // console.log(i, (i < start || i > end), e1)
        if (i < start - 1 || i > start + len - 2) return e1;
        try {
          return e1 + (isNaN(eval('e2' + path)) ? 0 : 1 * eval('e2' + path));
        }
        catch(e) {
          return -1;
        }
      }, 0);
    }

    this.PERCENT = PERCENT;
    function PERCENT(val) {
      if (!isNaN(val)) return val.toLocaleString('en-US', {maximumFractionDigits: 2, style: 'percent'});
      return val;
    }

    // sort an array of object (aob) by specific node
    // Arguments:
    //  aob - source array of object
    //  path - the specific node path as the sorting value
    //  ascending - the sort order is ascending or descending, default: ascending=true
    this.sort = sort;
    function sort(aob, path, ascending) {
      ascending = ascending  === undefined ? true : ascending;

      aob.sort(function(a,b){
        // compare numbers
        try {
          var aval = eval('a' + path);
          var bval = eval('b' + path);
          if (!isNaN(aval) && !isNaN(bval)) {
            return ascending ? aval - bval : bval　- aval;
          }
          else {
            var ad = Date.parse(aval);
            var bd = Date.parse(bval);
            if (isNaN(ad) || isNaN(bd)) {
              return aval + '' > bval + '' == ascending ? 1 : -1;
            }
            else {
              return ascending ? ad - bd : bd - ad;
            }
          }
        }
        catch(e) {
          return 1;
        }
      });
    }

    // filter an array of object (aob) by specific query statement, filtered objects
    // will be returned as aob in a callback function
    // Arguments:
    //  aob - source array of object
    //  query - query object:
    //    query = {
    //      path: node_path,
    //      method: evaluation_method,  ['lt', 'gt', 'eq', 'neq', 'leq', 'geq', 'match', 'like']
    //      value: comparison_value
    //    }
    //  cb - callback function, prototype: cb(filtered_aob)
    this.filter = filter;
    function filter(aob, query, cb) {
      var unmatched = [];
      var filtered = []

      aob.forEach(function(e, i, o){
        try {
          var passed = true;
          var value = eval('e' + query.path);
          var comp = query.value

          if (!isNaN(Date.parse(value)) && !isNaN(Date.parse(comp))) {
            value = Date.parse(value);
            comp = Date.parse(comp);
          }

          if (!isNaN(value) && !isNaN(comp)) {
            value *= 1;
            comp *= 1;
          }

          switch (query.method) {
            case '<':
              passed = (value < comp);
              break;
            case '>':
              passed = (value > comp);
              break;
            case '==':
              passed = (value == comp);
              break;
            case '!=':
              passed = (value != comp);
              break;
            case '<=':
              passed = (value <= comp);
              break;
            case '>=':
              passed = (value >= comp);
              break;
            case 'match':
              passed == (value < comp);
              passed = value.match(comp) ? true : false;
              break;
            case 'like':
              var regex = new RegExp(comp, 'i');
              passed = value.match(regex) ? true : false;
              break;
          }
          if (!passed) {
            unmatched.splice(0, 0, i);
          }
        }
        catch(e) {
          // console.error(e);
        }
      });

      unmatched.forEach(function(e){
        filtered.splice(0, 0, aob.splice(e, 1)[0]);
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
    this.objectIterator = objectIterator;
    this.oi = objectIterator;
    function objectIterator(obj, cb, leafOnly, arrayAsObj, path, cache) {
      leafOnly = leafOnly === undefined ? true : leafOnly;
      arrayAsObj = arrayAsObj === undefined ? false : arrayAsObj;
      path = path || [];

      if (obj && typeof obj == 'object' && (Array.isArray(obj) ? arrayAsObj : true)) {
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
              objectIterator(obj[key], cb, leafOnly, arrayAsObj, p, cache);
            }
          }
        });
      }
    }

    // Convert a object to a object-array (oa)
    // Arguments:
    //   obj - source object
    // Return: oa
    this.objectToArray = objectToArray;
    this.o2a = objectToArray;
    function objectToArray(obj) {
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

      objectIterator(obj, function(e,k,p,o){
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

    // Convert a Array data to an JSON data, the reverse function of objectToArray
    this.arrayToObject = arrayToObject;
    this.a2o = arrayToObject;
    function arrayToObject(ary) {
      if (!ary) return null;
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

    // complexParser, will parse a statement matched the following rules.
    // Rule:
    //  1. =[statement] - only statement wiithin =[] will be parsed
    //  2. AVG(table/field), SUM(table/field) - resolve AVG() and SUM() function first
    //     AVG() and SUM() will be evaluated first and replaced with evaluated result
    //  3. __table/field__ - field value will be looked for and replaced
    //  4. Arithmetic statement will be evaluated last.
    // Arguments:
    //  statement - statement to be evaluated
    //  refObj - refernce object to be looked for the value of node-ref
    this.complexParser = complexParser;
    function complexParser(statement, refObj, aob) {
      var ret = statement;
      if (ret.indexOf('=') == 0) {
        ret = ret.slice(1);
        ret = evalAobFunc('SUM', ret, aob);
        ret = evalAobFunc('AVG', ret, aob);
        ret = evalStatement(ret, refObj);
      }
      return ret;
    }

    // evaluate aob function (sum, avg) with the statement on the aob
    // Arguments:
    //  func - aob function name, currently: 'sum', 'avg'
    //  statement - statement to be evaluated
    //  aob - array of object
    function evalAobFunc(func, statement, aob) {
      try {
        if (!aob || statement.indexOf(func + '(') < 0 || eval(func.toLowerCase()) == undefined) {
          return statement;
        }
      }
      catch(e) {
        return statement;
      }

      var breakdown = [];

      var slice = statement.split(func + '(');
      breakdown.push(slice[0]);
      slice = slice.slice(1).join(func + '(');

      slice = slice.split(')');
      var path = slice[0].replace(/__/g, '').split('/');
      var table = path[0];
      path.splice(1, 0, 'data');
      path = convertPath(path.slice(1).join('/'));

      try {
        var result = eval(func.toLowerCase() + '(aob , \'' + path + '\')');

        breakdown.push(result);
        slice = slice.slice(1).join(')');

        if(slice && slice.length) {
          if (slice.indexOf(func + '(') > -1) {
            breakdown.push(evalAobFunc(func, slice, aob));
          }
          else {
            breakdown.push(slice);
          }
        }

        return breakdown.join('');
      }
      catch(e) {
        return statement;
      }
    }

    // traverse through an object and evaluate each node against reference object
    // and aob
    // Arguments:
    //  evalObj - object to be evaluated
    //  refObj - reference object
    //  aob - array of object used for aob function evaluation
    // Return: object with evaluated nodes
    this.evalObject = evalObject;
    function evalObject(evalObj, refObj, aob) {
      var obj = {};
      objectIterator(evalObj, function(e,k,p,o){
        var path = p.slice();
        path.push(k);
        path = convertPath(path.join('/'));

        try {
          if (typeof e == 'object') {
            eval('obj' + path + '= {}');
          }
          else {
            var ret = complexParser(e, refObj, aob);
            eval('obj' + path + '= "' + ret + '"');
          }
        }
        catch(e) {
          console.error(e);
        }
      }, false);

      return obj;
    }

    // evaluate a statement against a reference object
    // Arguments:
    //  statement - statement to be evaluated
    //  refObj - reference object to be looked for node-ref value
    // Return: evaluated string
    this.evalStatement = evalStatement;
    function evalStatement(statement, refObj) {
      var breakdowns = statement.split('__');
      for (var i = breakdowns.length -1; i > -1; i--) {
        if (breakdowns[i].length == 0) breakdowns.splice(i, 1);
      }
      if (breakdowns.length > 0) breakdowns = breakdowns.map(function(e){
        var path = e.split('/').slice(1).join('/');
        path = convertPath(path);

        var ret = getNodeValue(path, refObj);
        return ret ? ret : e;
      });

      var combo = breakdowns.join('');
      try {
        if (!isNaN(Date.parse(combo))) {
          var hbrk = combo.split('-');
          var sbrk = combo.split('/');
          if (hbrk.length == 3 || sbrk.length == 3) return combo;
        }

        var ret = eval(combo);
        return ret;
      }
      catch(e) {
        return combo;
      }
    }

    // get a node value of an object with node path
    // Arguments:
    //  path - node path
    //  obj - object
    // Return: node value
    this.getNodeValue = getNodeValue;
    function getNodeValue(path, obj) {
      try {
        return eval('obj' + path);
      }
      catch(e) {
        return '';
      }
    }

    // re-group array of object (aob) by one of the 'root' node
    // this function helps for grouping computing such as SUM, AVG.
    // Arguments:
    //  aob - Array of object to be processed
    //  path - 'root' node path of the object, ** object can only be re-grouped with
    //          the root node to keep the object structure unchanged.
    // Example:
    //  aob = [
    //    {name: 'Steven', city: 'New York'},
    //    {name: 'Peter', city: 'Chicago'},
    //    {name: 'Steven', city: 'Los Angeles'},
    //    {name: 'Mark', city: 'New York'},
    //  ]
    //  groupAoB(aob, 'city') = [
    //    { key: "New York",
    //      data: [
    //        {name: 'Steven', city: 'New York'},
    //        {name: 'Mark', city: 'New York'}
    //      ]
    //    },
    //    { key: "Chicago",
    //      data: [
    //        {name: 'Peter', city: 'Chicago'}
    //      ]
    //    },
    //    { key: "Los Angeles",
    //      data: [
    //        {name: 'Steven', city: 'Los Angeles'}
    //      ]
    //    },
    //  ]
    this.groupAoB = groupAoB;
    function groupAoB(aob, path) {
      var ret = [];
      aob.forEach(function(e){
        if (!path) {
          if (!ret[0]) ret[0] = {key: 'root', data: []};
          ret[0].data.push(e);
        }
        else if (eval('e' + path)) {
          var node = ret.find(function(f){
            return f.key == eval('e' + path);
          });

          if (!node) {
            node = {key: eval('e' + path), data: []};
            ret.push(node);
          }

          node.data.push(e);
        }
      });
      return ret;
    }
  }

  window.flexTools = window.flexTools || new FlexTools();

  if(!(window.flexTools instanceof FlexTools)) console.error("flexTools init failed")
})();
