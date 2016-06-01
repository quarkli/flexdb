/*
@license
Copyright (c) 2016 Quark Li. All rights reserved.
This code may only be used under the MIT license.
*/

(function() {
	'use strict';

  // provide database access APIs
  function FlexModel(){
    var me = this;
    var url = 'https://luminous-inferno-3027.firebaseio.com';
    var uid = null;
    var authentication = null;
    var username = '';
    var cbCache = [];
    var ubase = null;
    var fbase = new Firebase(url);

    // --- must be removed for production
    // uid = "abb11a6c-fd31-4b3d-be34-5fc261b80810";
    // _initUbase(uid);
    // --- must be removed for production

    fbase.onAuth(authDataCallback);

    function _initUbase(id) {
          uid = id;
          ubase = new Firebase(([url, 'userdb', uid]).join('/'));
          cbCache.forEach(function(e){
            me.on(e.path, e.event, e.cb)
          });
          cbCache.splice(0);
    }

    //  add user information to 'users' collection when login succeeded
    function authDataCallback(authData) {
      if (authData) {
        // save the user's profile into the database so we can list users,
        // use them in Security and Firebase Rules, and show profiles
        fbase.child("users").child(authData.uid).set({
          provider: authData.provider,
          name: getName(authData)
        });
        authentication = authData;
        username = getName(authData);
        _initUbase(authData.uid);
      }
    }

    //  get user's name according to authentication method
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

    // parse frebase return snapshot values into array data
    // function snapCb(snap, cb) {
    //   var ret = snap.val();
    //   var data = [];
    //   if (ret) {
    //     if (typeof ret == 'object') {
    //       Object.keys(ret).forEach(function(k){
    //         data.push({key: k, data: ret[k]});
    //       });
    //     }
    //     else {
    //       data.push(ret);
    //     }
    //     if (cb) cb(data, ret);
    //   }
    // }

    //  export below properties only for development convenience
    Object.defineProperty(this, 'fbase', {
      get: function(){return fbase}
    });

    Object.defineProperty(this, 'ubase', {
      get: function(){return ubase}
    });

    Object.defineProperty(this, 'uid', {
      get: function(){return uid}
    });

    Object.defineProperty(this, 'authentication', {
      get: function(){return authentication}
    });

    Object.defineProperty(this, 'username', {
      get: function(){return username}
    });

    // Authentication method, only authenticated user gets 'userdb' accessbility
    this.auth = function(eml, pwd, cb) {
      fbase.authWithPassword({
        email    : eml,
        password : pwd
      }, function(err, authData){
        if (authData) _initUbase(authData.uid);
        if (cb) cb(err, authData ? authData.uid : null);
      });
    };

    // Unauthentication method
    this.unauth = function() {
      fbase.unauth();
      uid = null;
      authentication = null;
      username = '';
    };

    // push data into specific path with auto-generated id
    this.push = function(path, data) {
      if (!uid) return;
      if (ubase) {
        ubase.child(path).push(data);
      }
    };

    // set data value at specific path
    this.set = function(path, data) {
      if (!uid) return;
      if (ubase) {
        ubase.child(path).set(data);
      }
    };

    // get data from specific path
    this.get = function(path, cb) {
      if (!uid) return;
      if (ubase) {
        if (cb) {
          ubase.child(path).once('value', function(snap){
            cb(snap.val());
          });
        }
        else {
          return new Promise(function(resolv, reject){
            ubase.child(path).once('value', function(snap){
              resolv(snap.val());
            });
          });
        }
      }
    }

    // set callback on specific path for specific event
    // if not authenticated, callback(s) will be cached and set after authenticated
    this.on = function(path, event, cb) {
      if (ubase) {
        ubase.child(path).on(event, function(snap){
          cb(snap.val());
        });
      }
      else {
        cbCache.push({path: path, event: event, cb: cb});
      }
    };

    // remove node at specific path
    this.remove = function(path) {
      if (!uid) return;
      if (ubase) {
        ubase.child(path).remove();
      }
    };

    // create new user
    this.newUser = function(email, pass, cb) {
      fbase.createUser({
        email: email,
        password: pass
      }, function(error, userData) {
        var err = null;
        var uid = null;
        if (error) {
          switch (error.code) {
            case "EMAIL_TAKEN":
              err = "The new user account cannot be created because the email is already in use.";
              break;
            case "INVALID_EMAIL":
              err = "The specified email is not a valid email.";
              break;
            default:
              err = "Error creating user:" + error.toString();
          }
        } else {
          uid = userData.uid;
        }
        if (cb) cb(err, uid);
      });
    };

    // login with oauth provider
    this.oauthLogin = function(provider) {
      fbase.authWithOAuthPopup("facebook", function(error, authData) {
        if (error) {
          console.log("Login Failed!", error);
        } else {
          console.log("Authenticated successfully with payload:", authData);
        }
      });
    };

    // change user password
    this.changePassword = function(oldpwd, newpwd, cb) {
      if (!uid) return;
      fbase.changePassword({
        email       : authentication.password.email,
        oldPassword : oldpwd,
        newPassword : newpwd
      }, function(error) {
        if (cb) cb(error);
      });
    };

    // delete user, and remove all user's data
    this.deleteUser = function(pwd, cb) {
      if (!uid) return;
      me.changePassword(pwd, pwd, function(e){
        if (e) {
          if (cb) cb(e);
        }
        else {
          fbase.child('users/' + authentication.uid).remove();
          fbase.child('userdb/' + authentication.uid).remove();
          fbase.removeUser({
            email    : authentication.password.email,
            password : pwd
          }, function(error) {
            if (cb) cb(error);
          });
        }
      });
    }

    // modify key in document and dependent documents
    this.modifyKey = function(path, oldKey, newKey, depPath) {
      if (!uid) return;
      if (ubase) {
        ubase.child(path).once('value', function(snap){
          if (snap) {
            var val = JSON.stringify(snap.val());
            var regex = new RegExp('"' + oldKey + '":', 'g')
            val = val.replace(regex, '"' + newKey + '":');
            ubase.child(path).set(JSON.parse(val));
            if (depPath) {
              me.modifyKey(depPath, oldKey, newKey);
            }
          }
        });
      }
    }

    // delete documents and dependent documents
    this.delete = function(path, depPath) {
      me.remove(path);
      if (depPath) me.remove(depPath);
    }
  }


  window.flexModel = window.flexModel || new FlexModel();

  if(!(window.flexModel instanceof FlexModel)) console.error("flexModel init failed")
})();
