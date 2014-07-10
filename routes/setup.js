var rek = require('rekuire');
var VError = require('verror');

var async = require('async');
var passport = require('passport');

var DB = require('db');
var gdb = DB.getDb;
var User = DB.User;
var config  = rek('config.js');
var setup = rek('setup.js');

var routes = rek('routes');

module.exports = function(req, res){
    if (global.SETUP) {
        if (req.method === 'POST') {
            var user = User.template(req.body.user.name);
            user.password = req.body.user.pass;
            user.password_confirm = req.body.user.pass_confirm;
            user.admin = true;

            var new_config = {};
            new_config.main = true;
            new_config.name = req.body.app.name;

            var check_user = function(user) {
                if (user.username && user.password) return true;
                return false;
            };
            
            var check_pass = function(user) {
                if (user.password === user.password_confirm) return true;
                return false;
            }

            var check_config =function(config) {
                if (config.name) return true;
                return false;
            };

            if (check_user(user) && check_config(new_config)) {
                
                if (check_pass(user)) {
                    
                    //prevent it form being saved
                    delete user.password_confirm;
                    
                    var tasks = [];

                    tasks.push(function(cb){
                        // update the config
                        gdb().collection("config", function(err, collection) {
                            if (err) {
                                return cb(err);
                            } else {
                                collection.update({main: true}, new_config, {upsert:true}, function(err, result) {
                                    if (err) {
                                        return cb(err);
                                    } else {
                                        return cb(null, result);
                                    }
                                });
                            }
                        });
                    });
    
                    tasks.push(function(cb){
                        // add the admin user
                        User.updateUser(user, cb);
                    });
    
                    tasks.push(setup.configure);
                    tasks.push(setup.ensure_users);
    
                    async.series(tasks, function(err, results) {
                        if (err) {
                            var new_err  = new VError(err, "Could not save first time configuration");
                            throw new_err;
                        }
    
                        res.redirect('/');
                    });  
                } else {
                    req.flash('error', 'Passwords do not match');
                    res.redirect('/');
                }
                
            } else {
                req.flash('error', 'Please fill in all fields');
                res.redirect('/');
            }



        } else  if (req.method === 'GET'){
            res.render('setup', routes.genPageEnv(req, res));
        }
    } else {
        res.redirect('/');
    }
};