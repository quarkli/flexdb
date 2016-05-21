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
      Polymer.dom(document).querySelector('#modalLogin').toggle();
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

  app.formExists = function(name) {
    return formlist.forms.find(e=>{return e.name == name}) || 
      formedit.forms.find(e=>{return e.name == name});
  };

  app.resetDefaultValues = function() {
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
  app.resetDefaultValues();

  // clear all binded data
  app.resetModels = function() {
    formlist.splice('forms', 0);
  };

  app.login = function() {
    if (flexModel && flexModel.uid) {
      logoutApp();
    }
    else {
      Polymer.dom(document).querySelector('#modalLogin').toggle();
    }
    app.closeDrawer();
  };

  app.fetchData = function() {
    // fetch data
    flexModel.on('table-schema', 'value', data=>{
      var d = []
      data.forEach(e=>{
       d.push({name: e.key, data: flexTools.json2array(e.data)});
      });
      formlist.refreshForms(d);
    });
  };

  app.curPage = function(route, target) {
    return route == target;
  };

  app.curTitle = function(title, target) {
    return title == target;
  };

  app.resetChanges = function() {
    formedit.$$('flex-form').pop('data');
    flexModel.get('table-schema/' + formedit.$$('flex-form').id, (d, o)=>{
      formedit.refreshForms([{name: formedit.$$('flex-form').id, data: flexTools.json2array(o)}]);
    });
  };

  app.cancelEdit = function() {
    app.resetChanges();
    flexModel.set('table-schema/' + formedit.$$('flex-form').id, {});
    if (app.title == 'Edit Form') {
      app.saveEdit();
    }
    else {
      history.back();
    }
  };

  app.saveEdit = function(saveas) {
    var table = saveas || formedit.$$('flex-form').id;
    flexModel.set('table-schema/' + table, {});
    flexModel.set('table-schema/' + table, flexTools.array2json(formedit.forms[0].data));
    history.back();
  };

  app.saveas = function() {
    if (app.formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }
    app.saveEdit(app.newFormName);
  };

  app.popModalConfirm = function() {
    modalConfirm.toggle();
  }

  app.popSaveAsDialog = function() {
    app.newFormName = '';
    saveasDialog.toggle();
  }

  app.popNewFormDialog = function() {
    app.newFormName = '';
    newFormDialog.toggle();
  };

  app.popImportDialog = function() {
    app.newFormName = '';
    app.extjson = '';
    importDialog.toggle();
  };

  app.auth = function() {
    if (flexModel) flexModel.auth(app.email, app.password, (err, uid)=>{
      if (uid) {
        initApp();
      }
      else {
        popToast('!!! User logged in failed, please check your email and password!', '#F48FB1');
      }
    });
  };

  app.regUser = function() {
    page('/registration');
  };

  app.newUser = function() {
    flexModel.newUser(app.email, app.password, (e,d)=>{
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

  app.newForm = function() {
    if (app.formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }
    var data = [{name: app.newFormName, data: []}];
    formedit.refreshForms(data);
    page(app.baseUrl+'form/new');
  };

  app.newImport = function() {
    if (app.formExists(app.newFormName)) {
        popToast("Form name duplicated!", '#F48FB1');
        return;
    }
    // console.log(flexTools.json2array(JSON.parse(app.extjson)))
    try {
      var data = [{name: app.newFormName, data: flexTools.json2array(JSON.parse(app.extjson))}];
      formedit.refreshForms(data);
      page(app.baseUrl+'form/new');
    }
    catch(e) {}
  };

  app.pwdMatched = function(pwd, cfm) {
    return pwd && pwd.length && pwd == cfm;
  };

  app.chgPwd = function() {
    if (app.email == 'guest@demo.flexdb') {
      popToast("You cannot change password of guest account!", '#F48FB1');
    }
    else {
      flexModel.changePassword(app.password, app.newPassword, e=>{
        if (e) {
          popToast("Passowrd change failed! Reason: " + e, '#F48FB1');
        }
        else {
          popToast('Password changed! Please use new password at next login.', '#B2DFDB');
        }
      });
    }
  };

  app.delAccount = function() {
    if (app.email == 'guest@demo.flexdb') {
      popToast("You cannot delete guest account!", '#F48FB1');
    }
    else {
      flexModel.deleteAccount(app.password, e=>{
        if (e) {
          popToast("Deleting account failed! Reason: " + e, '#F48FB1');
        }
        else {
          logoutApp();
        }
      });
    }
  };

  app.guestLogin = function() {
    app.email = app.guest.email;
    app.password = app.guest.pwd;
    app.auth();
    page('/');
  };

  function popToast(msg, color) {
    toast.text = msg;
    toast.$$('span').style = "color: " + (color ? color : 'white');
    toast.show();
  }

  function initApp() {
    app.resetDefaultValues();

    app.authenticated = true;
    app.username = flexModel.username;
    app.email = flexModel.authentication.password.email;
    popToast('User has logged in!', '#B2DFDB');

    app.fetchData();
    page('/');
  }

  function logoutApp() {
    flexModel.unauth();
    popToast('User has logged out!');
    app.resetModels();
    app.resetDefaultValues();
    page('/');
  }
})(document);
