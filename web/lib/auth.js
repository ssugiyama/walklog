const express = require('express');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const config     = require('../dist/config').default;
const models   = require('./models');
/*
 * GET home page.
 */

const auth = express.Router();
exports.router = auth;

const Users = models.sequelize.models.users;

passport.use(new TwitterStrategy({
    consumerKey: config.twitter_consumer_key,
    consumerSecret: config.twitter_consumer_secret,
    callbackURL: config.base_url + '/auth/twitter/callback',
}, function(token, tokenSecret, profile, done) {
    if (config.twitter_allowed_users && !config.twitter_allowed_users.includes(profile.username)) {
        done(null, false, {message: 'Sorry! Allowed users only.'});
        return;
    }
    Users.findOrCreate({
        where: {strategy: 'twitter', passport_id: profile.id},
        defaults: { username: profile.username, photo: profile.photos[0].value, profile: JSON.stringify(profile)}
    }).spread((user) => done(null, user, {message: `Logged in as ${profile.username}.`}));
}
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(obj, done) {
    Users.findById(obj).then(user => done(null, user));
});

exports.passport = passport;

auth.get('/twitter',
    passport.authenticate('twitter'));

auth.get('/twitter/callback', 
    passport.authenticate('twitter', { 
        successRedirect: '/',
        failureRedirect: '/',
        failureMessage: true,
        successMessage: true,
    }));

auth.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});
