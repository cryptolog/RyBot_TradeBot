var rek = require('rekuire');

var DB = rek('db');
var gdb = DB.getDb;
var config  = rek('config.js')

var bcrypt = require('bcrypt'),
    SALT_WORK_FACTOR = 10;

var Users, User;
module.exports = Users = {};

Users.listUsers = function(cb) {
    gdb().collection("users", function(err, collection) {
        if (err) return cb(err);
        collection.find().toArray(function(err, users) {
            if (err) return cb(err);
            cb(null, users);
        });
    });
};

Users.findByID = function(id, cb) {
    gdb().collection("users", function(err, collection){
        if (err) return cb(err);
        collection.findOne({_id: DB.ObjectID(id)}, function(err, data) {
            if (err) return cb(err);
            if (data) {
                var u = new User(data);
                return cb(null, u);
            } else {
                return cb(new Error('User ' + id + ' does not exist'));
            }
        });
    });
};

Users.findByUsername = function(username, cb) {
    gdb().collection("users", function(err, collection){
        if (err) return cb(err);
        collection.findOne({username: username.toLowerCase()}, function(err, user) {
            if (err) {
                return cb(err);
            } else {
                if (user) {
                    return cb(null, user);
                } else {
                    return cb(new Error('User ' + username + ' does not exist'));
                }
            }
        });
    });
};

Users.hashPassword = function(password, cb) {
    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if(err) return cb(err);
        
        bcrypt.hash(password, salt, function(err, hash) {
            if(err) return cb(err);
            return cb(null, hash);
        });
    });
};

Users.removeUser = function(user_obj, cb) {
    gdb().collection("users", function(err, collection) {
        if (err) {
            return cb(err);
        } else {
            //TODO: ACTUALY DELETE
            collection.update({username: user_obj.username}, user_obj, {upsert:true}, function(err, result) {
                if (err) {
                    return cb(err);
                } else {
                    return cb(null, result);
                }
            });
        }
    });
}

Users.comparePassword = function(candidatePassword, hash_pass, cb) {
    bcrypt.compare(candidatePassword, hash_pass, function(err, isMatch) {
        if(err) return cb(err);
        cb(null, isMatch);
    });
};


Users.User = User = function (user_obj) {
    
    if (typeof(user_obj) != 'object') {
        throw new Error("Invalid type for `user_obj`: expected `object`, got `" + typeof(user_obj) + "`");
    }
    
    if (typeof(user_obj.admin) === 'undefined') user_obj.admin = false;
    
    if (typeof(user_obj.name) != 'string') {
        throw new Error("Invalid type for `name`: expected `string`, got `" + typeof(user_obj.name) + "`");
    }
    
    if (typeof(user_obj.password) != 'undefined' && typeof(user_obj.password) != 'string' ) {
        throw new Error("Invalid type for `password`: expected `string`, got `" + typeof(user_obj.password) + "`");
    }
    
    if (typeof(user_obj.hash_password) != 'undefined' && typeof(user_obj.hash_password) != 'string' ) {
        throw new Error("Invalid type for `hash_password`: expected `string`, got `" + typeof(user_obj.hash_password) + "`");
    }
    
    if (typeof(user_obj.admin) != 'boolean') {
        throw new Error("Invalid type for `admin`: expected `boolean`, got `" + typeof(name) + "`");
    }
    
    var self = this;
    
    self.name = user_obj.name;
    self.username = user_obj.name.toLowerCase();
    self.hash_password = user_obj.hash_password || null;
    
    var user_password = user_obj.password || null;
    
    self.admin = user_obj.admin;
    
    self.updateUser = function(user_obj, cb) {
      Users.hashPassword(user_obj.password, function(err, hash) {
          if (err) return cb(err);
    
          user_obj.password = hash;
    
          gdb().collection("users", function(err, collection) {
              if (err) {
                  return cb(err);
              } else {
                  collection.update({username: user_obj.username}, user_obj, {upsert:true}, function(err, result) {
                      if (err) {
                          return cb(err);
                      } else {
                          return cb(null, result);
                      }
                  });
              }
          });
    
      })
    };
    
    self.save = function() {
    
    }
    
    self.setPassword = function (password, cb) {
        self.hashPassword(password, function(err, hash) {
            if (err) return cb(err);
    
            self.hash_password = hash;
            return cb(null, true);
      })
    }
    
    self.testPassword = function(pass, cb) {
        if (!self.hash_password) return cb(null, false);
        Users.comparePassword(pass, self.hash_password, function(err, isMatch) {
           if (err) return cb(err);
           return cb(null, isMatch);
        })
    }
    
    self.prepare = function(cb) {
        if (user_password) {
            self.setPassword(user_password, function(err, result){
                if (err) return cb(err);
                return cb(null, result);
            })
        }
    }
    
    
}

