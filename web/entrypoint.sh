#! /bin/sh

set -mx
npx sequelize-cli db:migrate

"$@"
