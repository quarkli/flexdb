/*
@license
Copyright (c) 2016 Quark Li. All rights reserved.
This code may only be used under the MIT license.
*/

(function() {
  'use strict';

  function FlexTools() {
    var me = this;

    // internal function to retrieve the path of object node
    function _getPath(data, node) {
      var path = [];
      var key = '';
      objectNodeIterator(data, (e,k,p,o)=>{
        if (k == node) {
          path = p.slice();
          key = k;
        }
      },true,true);
      path.push(key);
      path.splice(0, 1);
      path = path.map((a,b)=>{return '["'+a+'"]'}).reduce((a,b)=>{return a+b}, '');
      return path;
    }

    this.avg = avg;
    // calculate average value of a specific node in a object array data
    // Arguments:
    //  data - source data of object array
    //  node - the specific node to be calculated
    //  start - the start index of range of array to be calculated, starts from 1, default: 1
    //  len - the length of range of array from start index to be calculated, default: array size
    //  incEmpty - if a node has no value, whether to count it in as average divider, default: true
    function avg(data, node, start, len, incEmpty) {
      start = start || 1;
      len = len || data.length;
      incEmpty = incEmpty  === undefined ? true : incEmpty;

      var path = _getPath(data, node);
      var count = len;
      if (!incEmpty) {
        count = data.reduce((e1, e2, i)=>{
          if (i < start - 1 || i > start + len - 2) return e1;
          return eval('e2' + path).length || isNaN(eval('e2' + path)) ? ++e1 : e1;
        }, 0);
      }
      return sum(data, node, start, len) / count;
    }

    this.sum = sum;
    // calculate summarization of a specific node in a object array data
    // Arguments:
    //  data - source data of object array
    //  node - the specific node to be calculated
    //  start - the start index of range of array to be calculated, starts from 1, default: 1
    //  len - the length of range of array from start index to be calculated, default: array size
    function sum(data, node, start, len) {
      start = start || 1;
      len = len || data.length;

      var path = _getPath(data, node);
      return data.reduce((e1, e2, i)=>{
        // console.log(i, (i < start || i > end), e1)
        if (i < start - 1 || i > start + len - 2) return e1;
        return e1 + (isNaN(eval('e2' + path)) ? 0 : 1 * eval('e2' + path));
      }, 0);
    }

    this.sort = sort;
    // sort an object array data by specific node
    // Arguments:
    //  data - source data of object array
    //  node - the specific node to be sorted
    //  ascending - the sort order is ascending or descending, default ascending
    function sort(data, node, ascending) {
      ascending = ascending  === undefined ? true : ascending;

      var path = _getPath(data, node);
      data.sort((a,b)=>{
        // compare numbers
        if (!isNaN(eval('a' + path)) && !isNaN(eval('a' + path))) {
          return ascending ? eval('a' + path) - eval('b' + path) : eval('b' + path)　- eval('a' + path);
        }
        else {
          var ad = (new Date(eval('a' + path))).valueOf();
          var bd = (new Date(eval('b' + path))).valueOf();
          if (isNaN(ad) || isNaN(bd)) {
            return (eval('a' + path) > eval('b' + path)) == ascending ? 1 : -1;
          }
          else {
            return ascending ? ad - bd : bd - ad;
          }
        }
      });
    }

    this.objectNodeIterator = objectNodeIterator;
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
    function objectNodeIterator(obj, cb, leafOnly, arrayAsObj, path, cache) {
      leafOnly = leafOnly === undefined ? true : leafOnly;
      arrayAsObj = arrayAsObj === undefined ? false : arrayAsObj;
      path = path || [];

      if (typeof obj == 'object' && (Array.isArray(obj) ? arrayAsObj : true)) {
        cache = cache || [obj];
        Object.keys(obj).forEach(key=>{
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

    this.json2array = json2array;
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
    function json2array(jsn) {
      var ret = [];

      function findNode(p, a) {
        var realNode = null;
        var rootNode = a.find(e=>{
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

      flexTools.objectNodeIterator(jsn, (e,k,p,o)=>{
        var path = p.slice();
        var node = findNode(path, ret);
        if (node) {
          node.v.push({p: path, k: k, v: typeof e == 'object' ? [] : e});
        }
        else {
          ret.push({p: path, k: k, v: typeof e == 'object' ? [] : e});
        }
      }, false);
      return ret;
    }

    this.array2json = array2json
    // Convert a Array data to an JSON data, the reverse function of json2array
    function array2json(ary) {
      function iter(ary, obj) {
        ary.forEach(e=>{
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
  }

  window.flexTools = window.flexTools || new FlexTools();

  if(!(window.flexTools instanceof FlexTools)) console.error("flexTools init failed")
})();
