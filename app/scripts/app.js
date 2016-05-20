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
      app.authenticated = true;
      app.username = flexModel.uname;
      popToast('User has logged in!', '#B2DFDB');

      // fetch data
      flexModel.on('table-schema', 'value', data=>{
        var d = []
        data.forEach(e=>{
         d.push({name: e.key, data: flexTools.json2array(e.data)});
        });
        formlist.refreshForms(d);
      });
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

  app.username = '';

  app.email = '';

  app.password = '';

  app.authenticated = false;

  app.newFormName = '';

  app.guest = {email: 'guest@demo.flexdb', pwd: '0000'};

  app.login = function() {
    if (flexModel && flexModel.uid) {
      flexModel.unauth();
      app.authenticated = false;
      app.username = '';
      popToast('User has logged out!');
    }
    else {
      Polymer.dom(document).querySelector('#modalLogin').toggle();
    }
    app.closeDrawer();
  };

  app.curPage = function(route, target) {
    return route == target;
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
    app.saveEdit();
  };

  app.saveEdit = function() {
    flexModel.set('table-schema/' + formedit.$$('flex-form').id, {});
    flexModel.set('table-schema/' + formedit.$$('flex-form').id, flexTools.array2json(formedit.forms[0].data));
    history.back();
  }

  app.popModalConfirm = function() {
    modalConfirm.toggle();
  }

  app.auth = function() {
    if (flexModel) flexModel.auth(app.email, app.password, (err, uid)=>{
      if (uid) {
        app.authenticated = true;
        app.username = flexModel.uname;
        popToast('User has logged in!', '#B2DFDB');
      }
      else {
        popToast('!!! User logged in failed, please check your email and password!', '#F48FB1');
      }
    });
  };

  app.popNewFormDialog = function() {
    this.newFormName = '';
    newFormDialog.toggle();
  };

  app.newForm = function(e) {
    var data = [{name: this.newFormName, data: []}];
    formedit.refreshForms(data);
    page(app.baseUrl+'form/new');
  };

  app.guestLogin = function() {
    app.email = app.guest.email;
    app.password = app.guest.pwd;
    app.auth();
    modalLogin.toggle();
  };

  function popToast(msg, color) {
    toast.text = msg;
    toast.$$('span').style = "color: " + (color ? color : 'white');
    toast.show();
  }
})(document);
