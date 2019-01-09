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
    var uid = null;
    var authentication = null;
    var username = '';
    var cbCache = [];
    var ubase = null;
    var appCB = null;
    var signInErr = null;
    var signInPwd = null;
    var config = {
      apiKey: "AIzaSyAowwPsyEEQjSnIbZrJqEYotN0xjLzCUBk",
      authDomain: "luminous-inferno-3027.firebaseapp.com",
      databaseURL: "https://luminous-inferno-3027.firebaseio.com"
    };

    firebase.initializeApp(config);

    var fbase = firebase.database().ref();

    var fauth = firebase.auth();

    fauth.onAuthStateChanged(authCB);

    function _initUbase() {
          ubase = fbase.child('userdb').child(uid);
          cbCache.forEach(function(e){
            me.on(e.path, e.event, e.cb)
          });
          cbCache.splice(0);
    }

    //  add user information to 'users' collection when login succeeded
    function authCB(user) {
      if (user) {
        // user logged in
        // save the user's profile into the database so we can list users,
        // use them in Security and Firebase Rules, and show profiles
        authentication = fauth.currentUser;
        uid = authentication.uid;
        username = getName(authentication);

        fbase.child("users").child(uid).set({
          provider: authentication.providerData[0].providerId,
          name: username
        });

        _initUbase();
        if (appCB) appCB(null, uid);       
      }
      else {
        // user logged out
        signInPwd = null;
      }
    }

    //  get user's name according to authentication method
    function getName(user) {
      if ('password' == user.providerData[0].providerId) {
           return user.email.replace(/@.*/, '');
      }
      return '';
    }

    //  export below properties only for development convenience
    Object.defineProperty(this, 'fbase', {
      get: function(){return fbase}
    });

    Object.defineProperty(this, 'ubase', {
      get: function(){return ubase}
    });

    Object.defineProperty(this, 'fauth', {
      get: function(){return fauth}
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
      if (cb) {
        appCB = cb;
        fauth.onAuthStateChanged(authCB);
      }

      signInPwd = pwd;
      fauth.signInWithEmailAndPassword(eml, pwd).catch(function(err){
        if (appCB) appCB(err, null);              
        console.log(err);
        signInPwd = null;
      });
    };

    // Unauthentication method
    this.unauth = function() {
      fauth.signOut();
      uid = null;
      authentication = null;
      username = '';
      ubase = null;
      signInPwd = null;
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
      fauth.createUserWithEmailAndPassword(email, pass).catch(function(error) {
        var err = null;

        if (error) {
          switch (error.code) {
            case "auth/email-already-in-use":
              err = "The new user account cannot be created because the email is already in use.";
              break;
            case "auth/invalid-email":
              err = "The specified email is not a valid email.";
              break;
           case "auth/operation-not-allowed":
              err = "The email/password authentication is not enable on Firebase.";
              break;
           case "auth/weak-password":
              err = "The password is too weak.";
              break;              
            default:
              err = "Error creating user:" + error.message;
          }
        } 

        if (cb) cb(err, null);
      });
    };

    // change user password
    this.changePassword = function(pwd, cb) {
      if (!authentication) return;
      authentication.updatePassword(pwd).then(function(){
        signInPwd = pwd;
        if (cb) cb(null);
      }).catch(function(error) {
        if (cb) cb(error);
      });
    };

    // delete user, and remove all user's data
    this.deleteUser = function(pwd, cb) {
      if (!authentication) return;

      if (pwd == signInPwd) {
        fbase.child('users/' + uid).remove();
        fbase.child('userdb/' + uid).remove();
        authentication.delete().then(function() {
          signInPwd = null;
          if (cb) cb (null);
        }).catch(function(error) {
          if (cb) cb(error);
        }); 
      }
      else {
        if (cb) cb("Password incorrect!");
      }
    };

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
