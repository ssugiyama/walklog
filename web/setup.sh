#! /bin/sh
npx sequelize-cli db:migrate
npm run build-cli
cp -a assets/* public
if [ ! -d public/uploads ]
then
    mkdir public/uploads
fi
