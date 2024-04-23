#!/usr/bin/env node -r dotenv/config
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
});
const program = require('commander');

const callFB = async (isAdmin, uid) => {
    try {
        await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
        console.info('done');
    } catch (e) {
        console.error(e);
    }
};

program
    .command('add <uid>')
    .action(async (uid) => {
        await callFB(true, uid);
        process.exit(0);
    });

program
    .command('rm <uid>')
    .action(async (uid) => {
        await callFB(false, uid);
        process.exit(0);
    });

program.on('command:*', () => {
    program.outputHelp();
    process.exit(1);
});

program.parse(process.argv);
