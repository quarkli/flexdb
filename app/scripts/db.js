(function() {
	'use strict';

  function xdb(){
    var url = 'https://luminous-inferno-3027.firebaseio.com';
    var fbase = new Firebase(url);
    var ubase = null;
    var uid = null;
    var userData = null;

    function authHandler(error, authData) {
      if (error) {
        console.error("Login Failed with reason: " + error);
      }
    }

    function authDataCallback(authData) {
      if (authData) {
        // save the user's profile into the database so we can list users,
        // use them in Security and Firebase Rules, and show profiles
        fbase.child("users").child(authData.uid).set({
          provider: authData.provider,
          name: getName(authData)
        });
      }
    }

    function getName(authData) {
      switch(authData.provider) {
         case 'password':
           return authData.password.email.replace(/@.*/, '');
         case 'twitter':
           return authData.twitter.displayName;
         case 'facebook':
           return authData.facebook.displayName;
      }
    }

    function snapCb(snap, cb) {
      var ret = snap.val();
      var data = [];
      Object.keys(ret).forEach(k=>{
        data.push({key: k, data: ret[k]});
      });
      if (cb) cb(data);      
    }

    fbase.onAuth(authDataCallback);

    Object.defineProperty(this, 'fbase', {
      get: ()=>{return fbase}
    });

    Object.defineProperty(this, 'ubase', {
      get: ()=>{return ubase}
    });

    Object.defineProperty(this, 'uid', {
      get: ()=>{return uid}
    });

    this.auth = function(eml, pwd, cb) {
      fbase.authWithPassword({
        email    : eml,
        password : pwd
      }, (err, authData)=>{
        if (err) {
          console.error('Login failed: ' + err);
        }
        else {
          uid = authData.uid;
          if (cb) cb(authData.uid);
          ubase = new Firebase(([url, 'data', uid]).join('/'));
        }
      });
    };

    this.unauth = function() {
      fbase.unauth();
      uid = null;
    };

    this.push = function(path, data) {
      if (ubase) {
        ubase.child(path).push(data);
      }
    };

    this.set = function(path, data) {
      if (ubase) {
        ubase.child(path).set(data);
      }
    };

    this.get = function(path, cb) {
      if (ubase) {
        ubase.child(path).once('value', snap=>{
          snapCb(snap, cb)
        });
      }
    }

    this.on = function(path, event, cb) {
      if (ubase) {
        console.log(path,event, cb)
        ubase.child(path).on(event, snap=>{
          snapCb(snap, cb);
        });
      }
    };

    this.remove = function(path) {
      if (ubase) {
        ubase.child(path).remove();
      }
    };
  }


  window.xdb = window.xdb || new xdb();

  if(!(window.xdb instanceof xdb)) console.error("xdb init failed")
})();
