const express = require('express');
const passport = require('passport');
const TwitterStrategy = require('passport-twitter').Strategy;
const configulation   = require('../config');
const models   = require('./models');
/*
 * GET home page.
 */

const auth = express.Router();
exports.router = auth;

const Users = models.sequelize.models.users;

passport.use(new TwitterStrategy({
    consumerKey: configulation.twitter_consumer_key,
    consumerSecret: configulation.twitter_consumer_secret,
    callbackURL: configulation.base_url + '/auth/twitter/callback',
}, function(token, tokenSecret, profile, done) {
    if (configulation.twitter_allowed_users && !configulation.twitter_allowed_users.includes(profile.username)) {
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

auth.get('/twitter', (req, res, next) => {
    req.session.redirect = req.query.redirect;
    passport.authenticate('twitter')(req, res, next);
});

auth.get('/twitter/callback', (req, res, next) => { 
    const redirect = req.session.redirect;
    delete req.session.redirect;
    passport.authenticate('twitter', { 
        successRedirect: redirect || '/',
        failureRedirect: redirect || '/',
        failureMessage: true,
        successMessage: true,
    })(req, res, next);
});

auth.get('/logout', function(req, res){
    req.logout();
    res.redirect(req.query.redirect || '/');
});
