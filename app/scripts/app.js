
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

  function supportsPolymer() {
    return 'content' in document.createElement('template') && 'import' in document.createElement('link') && 'registerElement' in document && document.head.createShadowRoot;
  }
  if(!supportsPolymer()) {
   alert("The browser does not support.innerHTML5.\n Use Chrome, Firefox, Opera, or Safari(6+) to run this applicaiton.");
  }

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
      return id > -1 ?　JSON.parse(JSON.stringify(formlist.forms[id])) : undefined;
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

  app.getDocument = function(table, doc) {
    var table = app.getTable(table);

    for (var i in table) {
      if (table[i].key == doc) return flexTools.json2array(table[i].data);
    }
  };

  app.saveView = function(name, view) {
    if (viewExists(name)) {
        popToast("View name duplicated!", '#F48FB1');
        return false;
    }
    app.updateView(name, view);
    return true;
  };

  app.updateView = function(name, view) {
    flexModel.set('transit-view/' + name, view);
  };

  app.produceView = function(name) {
    // 1. prepare source data
    //  1-1. run filters on reference source data
    //  1-2. get primary key and group data by pkey
    // 2. evaluate view values with source data 
    //    and push evaluation result into table
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
      flexModel.changePassword(app.password, app.newPassword, function(e){
        spinReason.innerHTML = "";
        spinDialog.opened = false;
        if (e) {
          popToast("Passowrd change failed! Reason: " + e, '#F48FB1');
        }
        else {
          popToast('Password changed! Please use new password at next login.', '#B2DFDB');
        }
      });
    }
  };

  app.delAccount = function(event, params) {
    if (app.email == 'guest@demo.flexdb') {
      popToast("You cannot delete guest account!", '#F48FB1');
    }
    else {
      spinReason.innerHTML = "Deleting Account";
      spinDialog.opened = true;
      flexModel.deleteAccount(app.password, function(e){
        spinReason.innerHTML = "";
        spinDialog.opened = false;
        if (e) {
          popToast("Deleting account failed! Reason: " + e, '#F48FB1');
        }
        else {
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
    var data = [{name: app.newFormName, data: []}];
    formedit.refreshForms(data);
    page('/forms/new');
  };

  app.newData = function(event, params) {
    var table = tableview.form.name;
    if (table) page('/tables/' + table + '/input');
  };

  app.newImport = function(event, params) {
    if (formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }

    try {
      var data = [{name: app.newFormName, data: flexTools.json2array(JSON.parse(app.extjson))}];
      formedit.refreshForms(data);
      page('/forms/new');
    }
    catch(e) {}
  };

  app.resetChanges = function(event, params) {
    formedit.$$('flex-form').pop('data');
    flexModel.get('table-schema/' + formedit.forms[0].name, function(d, o){
      formedit.refreshForms([{name: formedit.forms[0].name, data: flexTools.json2array(o)}]);
    });
  };

  app.pageBack = function(event, params) {
    var parent = page.current.split('/').slice(0,2).join('/');
    page(parent);
  };

  app.saveEdit = function(event, params) {
    var table = params.formname || formedit.forms[0].name;
    flexModel.set('table-schema/' + table, {});
    flexModel.set('table-schema/' + table, flexTools.array2json(formedit.forms[0].data));
    page('/');
  };

  app.saveas = function(event, params) {
    if (formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }
    if (!params) params = {};
    params.formname = app.newFormName;
    app.saveEdit(event, params);
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
    var data = flexTools.array2json(target.forms[0].data);
    flexTools.objectNodeIterator(data, function(e){hasData = hasData || e.length > 0});

    if (formExists(table) && hasData) {
      data = flexTools.array2json(target.forms[0].data);
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
    flexModel.remove('source-data/' + path);
  };

  app.dropForm = function(event, params) {
    if (formlist.forms.length < 2 && formlist.forms[0].name == params.name) {
      formlist.refreshForms([]);
      updateTablelist();
    }
    flexModel.remove('table-schema/' + params.name);
    flexModel.remove('source-data/' + params.name);
  };

  app.popCancelEditDialog = function(event, params) {
    cancelEditDialog.toggle();
  }

  app.popSaveAsDialog = function(event, params) {
    app.newFormName = '';
    saveasDialog.toggle();
  }

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

    tablelist.tables.forEach(function(e, i){
      if (!formlist.forms.find(function(f){return f.name == e.name})) {
        tablelist.splice('tables', i, 1);
      }
    });
  }

  function initApp() {
    resetDefaultValues();

    app.authenticated = true;
    app.username = flexModel.username;
    app.email = flexModel.authentication.password.email;
    popToast('User has logged in!', '#B2DFDB');

    // fetch data
    flexModel.on('table-schema', 'value', function(data){
      var d = [];
      data.forEach(function(e){
        var form = {name: e.key, data: flexTools.json2array(e.data)};
        d.push(form);
      });
      formlist.refreshForms(d);
      updateTablelist();
    });

    flexModel.on('source-data', 'value', function(data){
      tablelist.splice('tables', 0);
      data.forEach(function(e){
        var d = [];
        Object.keys(e.data).forEach(function(k){
          d.push({key: k, data: e.data[k]});
        });
        tablelist.push('tables', {name: e.key, rows: d.length, data: d});
      });
      updateTablelist();
    });

    flexModel.on('transit-view', 'value', function(data){
      viewlist.splice('views', 0);
      data.forEach(function(e){
        var view = {name: e.key, data: e.data};
        viewlist.push('views', view);
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

  function viewExists(name) {
    return viewlist.views.find(function(e){return e.name == name});
  }

  function popToast(msg, color) {
    toast.text = msg;
    toast.$$('span').style = "color: " + (color ? color : 'white');
    toast.show();
  }
})(document);
