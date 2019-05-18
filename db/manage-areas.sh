#! /bin/bash

while getopts acdph: OPT
do
    case $OPT in
        [acdp])  MOD_ARG="-$OPT"
            ;;
        h)  HOST_ARG="-h $OPTARG"
            ;;
    esac
done
shift $(($OPTIND - 1))

if [ -n "$POSTGRES_DB" ]; then
    DB_ARG="-d $POSTGRES_DB"
fi

shp2pgsql $MOD_ARG -s 4326 -g the_geom -I -W cp932 $1 areas | psql $HOST_ARG $DB_ARG -U ${POSTGRES_USER:-postgres}