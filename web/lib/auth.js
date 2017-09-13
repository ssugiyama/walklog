const express = require('express');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const config     = require('../dist/config').default;
/*
 * GET home page.
 */

const auth = express.Router();
exports.router = auth;

passport.use(new TwitterStrategy({
    consumerKey: config.twitter_consumer_key,
    consumerSecret: config.twitter_consumer_secret,
    callbackURL: config.twitter_callback_url,
}, function(token, tokenSecret, profile, done) {
    if (config.twitter_allowed_users && !config.twitter_allowed_users.includes(profile.username)) {
        done(null, false, {message: 'Sorry! Allowed users only.'});
        return;
    }
    done(null, profile, {message: `Logged in as ${profile.username}.`});
}
));

passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
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