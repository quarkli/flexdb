
// @license
// Copyright (c) 2016 Quark Li. All rights reserved.
// This code may only be used under the MIT license.

/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

(function(document) {
  'use strict';

  // Grab a fbaseerence to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  // Initialize Applicaiton defalut values
  resetDefaultValues();

  // Sets app default base URL
  app.baseUrl = '/';
  if (window.location.port === '') {  // if production
    // Uncomment app.baseURL below and
    // set app.baseURL to '/your-pathname/' if running from folder in production
  }

  app.displayInstalledToast = function() {
    // Check to make sure caching is actually enabled—it won't be in the dev environment.
    if (!Polymer.dom(document).querySelector('platinum-sw-cache').disabled) {
      Polymer.dom(document).querySelector('#caching-complete').show();
    }
  };

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
    console.log('Our app is ready to rock!');
  });

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    // imports are loaded and elements have been registered
     if (flexModel && !flexModel.uid) {
       $('#modalLogin')[0].toggle();
    }
    else {
      initApp();
    }
  });

  window.addEventListener('popstate', function() {
    $('paper-dialog').prop('opened', false);
  });

  // Main area's paper-scroll-header-panel custom condensing transformation of
  // the appName in the middle-container and the bottom title in the bottom-container.
  // The appName is moved to top and shrunk on condensing. The bottom sub title
  // is shrunk to nothing on condensing.
  window.addEventListener('paper-header-transform', function(e) {
    var appName = Polymer.dom(document).querySelector('#mainToolbar .app-name');
    var middleContainer = Polymer.dom(document).querySelector('#mainToolbar .middle-container');
    // var bottomContainer = Polymer.dom(document).querySelector('#mainToolbar .bottom-container');
    var detail = e.detail;
    var heightDiff = detail.height - detail.condensedHeight;
    var yRatio = Math.min(1, detail.y / heightDiff);
    // appName max size when condensed. The smaller the number the smaller the condensed size.
    var maxMiddleScale = 0.50;
    var auxHeight = heightDiff - detail.y;
    var auxScale = heightDiff / (1 - maxMiddleScale);
    var scaleMiddle = Math.max(maxMiddleScale, auxHeight / auxScale + maxMiddleScale);
    var scaleBottom = 1 - yRatio;

    // Move/translate middleContainer
    Polymer.Base.transform('translate3d(0,' + yRatio * 100 + '%,0)', middleContainer);

    // Scale bottomContainer and bottom sub title to nothing and back
    // Polymer.Base.transform('scale(' + scaleBottom + ') translateZ(0)', bottomContainer);

    // Scale middleContainer appName
    Polymer.Base.transform('scale(' + scaleMiddle + ') translateZ(0)', appName);
  });

  // Scroll page to top and expand header
  app.scrollPageToTop = function() {
    app.$.headerPanelMain.scrollToTop(true);
  };

  app.closeDrawer = function() {
    app.$.paperDrawerPanel.closeDrawer();
  };

  // Evaluation Functions
  app.curPage = function(route, target) {
    return route == target;
  };

  app.curTitle = function(title, target) {
    return title == target;
  };

  app.pwdMatched = function(pwd, cfm) {
    return pwd && pwd.length && pwd == cfm;
  };

  app.isRootPage = function() {
    return page.current.split('/').length == 2;
  };

  // Generic Functions
  app.getForm = function(name) {
    try{
      var id = formlist.forms.findIndex(function(e){return e.name == name;});
      return id > -1 ?　flexTools.cloneObject(formlist.forms[id]) : undefined;
    }
    catch(e) {
      return undefined;
    }
  };

  app.getTable = function(name) {
    var tables = tablelist.tables;
    for (var i in tables) {
      if (tables[i].name == name) return tables[i].data;
    }
  };

  app.getView = function(name) {
    try {
      return viewlist.views.find(function(e){return e.name == name});
    }
    catch(e) {
      return null;
    }
  };



  app.getDocument = function(table, doc) {
    var table = app.getTable(table);

    for (var i in table) {
      if (table[i].key == doc) return flexTools.objectToArray(table[i].data);
    }
  };

  app.getViewForm = function(name) {
    var view = app.getView(name);
    return view ? view.form : null;
  };

  app.getViewTable = function(name) {
    var table = viewlist.viewtables.find(function(e){return e.name == name});
    return table ? table.data : [];
  };

  app.saveView = function(name, view) {
    if (app.title != 'Edit View' && app.getView(name)) {
        popToast("View name duplicated!", '#F48FB1');
        return false;
    }
    app.updateView(name, view);
    return true;
  };

  app.saveViewEdit = function(event, params) {
    if (viewedit.forms[0]) {
      var view = flexTools.arrayToObject(viewedit.forms[0].data);
      app.updateView(viewedit.forms[0].name, view);
      page('/views/' + viewedit.forms[0].name);
    }
  };

  app.saveasNewView = function(event, params) {
    if (viewedit.forms[0]) {
      var view = flexTools.arrayToObject(viewedit.forms[0].data);
      app.updateView(app.newViewName, view);
      page('/views/' + app.newViewName);
    }
  };

  app.updateView = function(name, view) {
    flexModel.set('transit-view/' + name, view);
    app.produceViewTable(name);
  };

  app.findSingleDocTable = function() {
    var ret = [];

    tablelist.tables.forEach(function(e){
      if (e.row == 1) {
        ret.push({type: 'table', name: e.name});
      }
    });

    viewlist.views.forEach(function(e){
      var table = app.getViewTable(e.name);
      if (table.length == 1) ret.push({type: 'view', name: e.name});
    });

    return ret;
  };

  app.produceViewTable = function(name) {
    name = name.length ? name : app.title;

    var view = app.getView(name);
    if (!view) return null;

    var viewsrc = view.source;
    var filters = viewsrc.filters;
    var srcName = viewsrc.data.name;
    var srcTbl = viewsrc.data.type == 'table' ? app.getTable(srcName) : app.getViewTable(srcName);
    srcTbl = flexTools.cloneObject(srcTbl);

    if (filters && filters.length) {
      filters.forEach(function(e){
        var query = flexTools.cloneObject(e);
        query.path = '["data"]' + query.path;
        flexTools.filter(srcTbl, query);
      });
    }

    var form = app.getViewForm(name);
    var obj = flexTools.arrayToObject(form);
    var tgtTbl = viewsrc.group ?[{key: 0, data: srcTbl}] : srcTbl;
    flexModel.remove('computed-view/' + name);

    var refObj = [];
    app.findSingleDocTable().forEach(function(e){
      var table;
      if (e.type == 'table') {
        table = app.getTable(e.name);
      }
      if (e.type == 'view') {
        table = app.getViewTable(e.name);
      }
      if (table && table.length) refObj.push({name: e.name, data: table[0].data});
    });

    tgtTbl.forEach(function(e){
      var ref = refObj.slice();
      ref.splice(0, 0, {name: srcName, data: e.data});
      var value = flexTools.evalObject(obj, ref, srcTbl);
      flexModel.set('computed-view/' + name + '/' + e.key, value);
    });

    if (name == app.title) page(page.current);
  };

  // Tap-triggered Functions
  app.login = function(event, params) {
    if (flexModel && flexModel.uid) {
      logoutApp();
    }
    else {
      $('#modalLogin')[0].toggle();
    }
    app.closeDrawer();
  };

  app.auth = function(event, params) {
    if (flexModel) {
      spinReason.innerHTML = "Logging in";
      spinDialog.opened = true;
      flexModel.auth(app.email, app.password, function(err, uid){
        spinReason.innerHTML = "";
        spinDialog.opened = false;
        if (uid) {
          initApp();
        }
        else {
          popToast('!!! User logged in failed, please check your email and password!', '#F48FB1');
        }
      });
    }
  };

  app.regUser = function(event, params) {
    page('/registration');
  };

  app.newUser = function(event, params) {
    spinReason.innerHTML = "Registering";
    spinDialog.opened = true;
    flexModel.newUser(app.email, app.password, function(e,d){
      spinReason.innerHTML = "";
      spinDialog.opened = false;
      if (e) {
        popToast("Registration failed! Reason: " + e, '#F48FB1');
      }
      else {
        popToast('Registration completed! Redirect to homepage.', '#B2DFDB');
        app.auth();
        page('/');
      }
    });
  };

  app.chgPwd = function(event, params) {
    if (app.email == 'guest@demo.flexdb') {
      popToast("You cannot change password of guest account!", '#F48FB1');
    }
    else {
      spinReason.innerHTML = "Changing Password";
      spinDialog.opened = true;
      flexModel.changePassword(app.newPassword, function(e){
        spinReason.innerHTML = "";
        spinDialog.opened = false;
        if (e) {
          popToast("Passowrd change failed! Reason: " + e, '#F48FB1');
        }
        else {
          popToast('Password changed! Please use new password at next login.', '#B2DFDB');
          page('/');
        }
      });
      app.newPassword = '';
      app.cfmNewPassword = '';
    }
  };

  app.delAccount = function(event, params) {
    if (app.email == 'guest@demo.flexdb') {
      popToast("You cannot delete guest account!", '#F48FB1');
    }
    else {
      spinReason.innerHTML = "Deleting Account";
      spinDialog.opened = true;
      flexModel.deleteUser(app.password, function(e){
        spinReason.innerHTML = "";
        spinDialog.opened = false;
        if (e) {
          popToast("Deleting account failed! Reason: " + e, '#F48FB1');
        }
        else {
          popToast("User logged out!", '#F48FB1');
          logoutApp();
        }
      });
    }
  };

  app.guestLogin = function(event, params) {
    app.email = app.guest.email;
    app.password = app.guest.pwd;
    app.auth();
    page('/');
  };

  app.newForm = function(event, params) {
    if (formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }
    var data = {name: app.newFormName, data: []};
    formedit.splice('forms', 0);
    formedit.push('forms', data);
    page('/forms/new');
  };

  app.newData = function(event, params) {
    var table = datatable.form.name;
    if (table) page('/tables/' + table + '/input');
  };

  app.newImport = function(event, params) {
    if (formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }

    try {
      var data = {name: app.newFormName, data: flexTools.objectToArray(JSON.parse(app.extjson))};
      formedit.splice('forms', 0);
      formedit.push('forms', data);
      page('/forms/new');
    }
    catch(e) {}
  };

  app.resetChanges = function(event, params) {
    page(page.current);
  };

  app.pageBack = function(event, params) {
    if (page.current.match('wizard')) {
      page('/views');
      return;
    }

    var path = page.current.split('/');

    if (path.length > 3 && path[1] == 'tables' && app.getTable(path[2])) {
      path.splice(3);
    }
    else {
      path.splice(2);
    }

    page(path.join('/'));
  };

  app.saveForm = function(event, params) {
    var table = params.formname || formedit.forms[0].name;
    flexModel.set('table-schema/' + table, {});
    flexModel.set('table-schema/' + table, flexTools.arrayToObject(formedit.forms[0].data));
    page('/');
  };

  app.saveas = function(event, params) {
    if (formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }
    if (!params) params = {};
    params.formname = app.newFormName;
    app.saveForm(event, params);
  };

  app.finishInput = function(event, params) {
    var path = page.current.split('/');
    path = path.slice(0, 3);
    page(path.join('/'));
  };

  app.saveData = function(event, params) {
    var target = page.current.match('input') ? datainput : dataedit;
    var table = target.forms[0].name;
    var hasData = false;
    var data = flexTools.arrayToObject(target.forms[0].data);
    flexTools.objectIterator(data, function(e){hasData = hasData || e.length > 0});

    if (formExists(table) && hasData) {
      data = flexTools.arrayToObject(target.forms[0].data);
      if (target == datainput) {
        flexModel.push('source-data/' + table, data);
        page('/tables/' + table + '/input');
      }
      else {
        var key = page.current.split('/').pop();
        flexModel.set('source-data/' + table + '/' + key, data);
        page('/tables/' + table);
      }
    }
    else {
      popToast("No data inputed, save skipped!", '#F48FB1');
    }
  };

  app.modifyKey = function(event, params) {
    var id = $(event.target).parents('flex-forms')[0].id;
    var path = '';
    var depPath = '';
    if (id.indexOf('view') > -1) {
      path = 'transit-view/' + params.doc;
      depPath = 'computed-view/' + params.doc;
    }
    else if (id.indexOf('form') > -1) {
      path = 'table-schema/' + params.doc;
      depPath = 'source-data/' + params.doc;
    }

    if (path.length && depPath.length) {
      flexModel.modifyKey(path, params.oldKey, params.newKey, depPath);
    }
  };

  app.updateDocument = function(event, params) {
    var form = event.target.form ? event.target.form.name :
      $(event.target).parents('flex-table')[0].form.name;
    if (!form) return;

    var path = params.field.path.slice(0);
    path.splice(0, 0, params.key);
    path.splice(0, 0, form);
    path.push(params.field.key);
    path = path.join('/');

    flexModel.set('source-data/' + path, params.value);
  };

  app.deleteDocument = function(event, params) {
    var form = event.target.form ? event.target.form.name :
      $(event.target).parents('flex-table')[0].form.name;
    if (!form) return;

    var path = [form];
    path.push(params.key);
    path = path.join('/');
    flexModel.delete('source-data/' + path);
    datatable.table = app.getTable(form);
  };

  app.dropForm = function(event, params) {
    var form = app.getForm(params.name);
    if (form) {
      var id = formlist.forms.indexOf(form);
      formlist.splice('forms', id, 1);
      flexModel.delete('table-schema/' + params.name, 'source-data/' + params.name);
      tablelist.tables.forEach(function(e, i){
        if (e.name == params.name) tablelist.splice('tables', i, 1);
      });
    }
  };

  app.dropView = function(event, params) {
    if (app.route != 'viewtable') return;
    var view = app.getView(app.title);

    if (view) {
      var id = viewlist.views.indexOf(view);
      viewlist.splice('views', id, 1);
      flexModel.delete('transit-view/' + app.title, 'computed-view/' + app.title);
      page('/views');
    }
  };

  app.editView = function(event, params) {
    var view = viewtable.form.name;
    page('/view/wizard/' + view);
  };

  app.popDeleteViewDialog = function(event, params) {
    deleteViewDialog.toggle();
  };

  app.popCancelEditDialog = function(event, params) {
    cancelEditDialog.toggle();
  };

  app.popSaveAsDialog = function(event, params) {
    app.newFormName = '';
    saveasDialog.toggle();
  };

  app.popSaveAsNewViewDialog = function(event, params) {
    app.newViewName = '';
    saveasNewViewDialog.toggle();
  };

  app.popNewFormDialog = function(event, params) {
    if (!app.authenticated) {
      app.login();
      return;
    }
    app.newFormName = '';
    formedit.splice('forms', 0);
    newFormDialog.toggle();
  };

  app.popImportDialog = function(event, params) {
    if (!app.authenticated) {
      app.login();
      return;
    }
    app.newFormName = '';
    app.extjson = '';
    importDialog.toggle();
  };

  app.cancelEdit = function(event, params) {
    if (app.route == 'form-edit') {
      app.popCancelEditDialog();
    }
    else {
      app.pageBack();
    }
  };

  app.dialogKeyHandle = function(event, params) {
    var target = event.target;
    var btn = null;

    if (target.tagName.toLowerCase() !== 'paper-dialog') {
      target = $(target).parents('paper-dialog')[0];
    }

    if (!target) return;

    switch(event.keyCode) {
      case 13:
        btn = $(target).find('.defaultConfirm')[0];
        break;
      case 27:
        btn = $(target).find('.defaultCancel')[0];
        break;
    }

    if (btn && !btn.disabled) btn.click();
  };

  app.setDialogFocus = function(event, params) {
    var target = $(event.target).find('.defaultFocus')[0];
    if (target) target.focus();
  };

  // Private Functions
  function resetDefaultValues() {
    app.username = '';
    app.email = '';
    app.password = '';
    app.authenticated = false;
    app.newFormName = '';
    app.extjson = '';
    app.guest = {email: 'guest@demo.flexdb', pwd: '0000'};
    app.newPassword = '';
    app.cfmNewPassword = '';
  };

  function updateTablelist() {
    formlist.forms.forEach(function(e){
      if (!tablelist.tables.find(function(f){return f.name == e.name})) {
        tablelist.push('tables', {name: e.name, rows: 0});
      }
    });
  }

  function initApp() {
    resetDefaultValues();

    app.authenticated = true;
    app.username = flexModel.username;
    app.email = flexModel.authentication.email;
    popToast('User has logged in!', '#B2DFDB');

    // fetch data
    flexModel.on('table-schema', 'value', function(snap){
      formlist.splice('forms', 0);
      if (!snap) return;
      Object.keys(snap).forEach(function(k){
        var form = {name: k, data: flexTools.objectToArray(snap[k])};
        formlist.push('forms', form);
      });
      updateTablelist();
    });

    flexModel.on('source-data', 'value', function(snap){
      tablelist.splice('tables', 0);
      if (!snap) return;
      Object.keys(snap).forEach(function(k){
        var data = snap[k];
        var d = [];
        Object.keys(data).forEach(function(k){
          d.push({key: k, data: data[k]});
        });
        tablelist.push('tables', {name: k, rows: d.length, data: d});
      });
      updateTablelist();
    });

    flexModel.on('transit-view', 'value', function(snap){
      viewlist.splice('views', 0);
      if (!snap) return;
      Object.keys(snap).forEach(function(k){
        viewlist.push('views', snap[k]);
      });
    });

    flexModel.on('computed-view', 'value', function(snap){
      viewlist.splice('viewtables', 0);
      if (!snap) return;
      Object.keys(snap).forEach(function(k){
        var data = snap[k];
        var d = [];
        Object.keys(data).forEach(function(k){
          d.push({key: k, data: data[k]});
        });
        viewlist.push('viewtables', {name: k, rows: d.length, data: d});
      });
    });

    page('/');
  }

  function logoutApp() {
    flexModel.unauth();
    popToast('User has logged out!');

    formlist.splice('forms', 0);
    tablelist.splice('tables', 0);
    resetDefaultValues();
    page('/');
  }

  function formExists(name) {
    return formlist.forms.find(function(e){return e.name == name}) || 
      formedit.forms.find(function(e){return e.name == name});
  }

  function popToast(msg, color) {
    toast.text = msg;
    toast.$$('span').style = "color: " + (color ? color : 'white');
    toast.show();
  }
})(document);
