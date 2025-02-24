const Sequelize = require('sequelize');
const models = require('./models');

const { sequelize } = models;
const { Walk } = models;

const { Op } = Sequelize;

exports.searchFunc = async (params, draftUid = null) => {
    const orderHash = {
        newest_first: ['date', 'desc'],
        oldest_first: 'date',
        longest_first: ['length', 'desc'],
        shortest_first: 'length',
        easternmost_first: [sequelize.fn('st_xmax', sequelize.col('path')), 'desc'],
        westernmost_first: sequelize.fn('st_xmin', sequelize.col('path')),
        southernmost_first: sequelize.fn('st_ymin', sequelize.col('path')),
        northernmost_first: [sequelize.fn('st_ymax', sequelize.col('path')), 'desc'],
        nearest_first: sequelize.literal('distance'),
    };
    const where = [];
    const order = orderHash[params.order || 'newest_first'];
    const attributes = ['id', 'date', 'title', 'image', 'comment', 'path', 'length', 'uid', 'draft'];

    if (params.id) {
        where.push({ id: params.id });
    } else if (params.date) {
        where.push({ date: params.date });
    } else {
        if (params.user) {
            where.push({ uid: params.user });
        }
        if (params.year) {
            where.push(sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('date')), parseInt(params.year, 10)));
        }
        if (params.month) {
            where.push(sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('date')), parseInt(params.month, 10)));
        }

        if (['neighborhood', 'start', 'end'].includes(params.filter)) {
            const latitude = parseFloat(params.latitude);
            const longitude = parseFloat(params.longitude);
            const radius = parseFloat(params.radius);
            const dlat = (radius * 180) / Math.PI / Walk.EARTH_RADIUS;
            const mlat = latitude > 0 ? latitude + dlat : latitude - dlat;
            const dlon = dlat / Math.cos((mlat / 180) * Math.PI);
            const center = Walk.getPoint(longitude, latitude);
            const lb = Walk.getPoint(longitude - dlon, latitude - dlat);
            const rt = Walk.getPoint(longitude + dlon, latitude + dlat);
            let target;
            switch (params.filter) {
            case 'neighborhood':
                target = sequelize.col('path');
                break;
            case 'start':
                target = sequelize.fn('st_startpoint', sequelize.col('path'));
                break;
            default:
                target = sequelize.fn('st_endpoint', sequelize.col('path'));
                break;
            }
            where.push(sequelize.where(sequelize.fn('st_makebox2d', lb, rt), {
                [Op.overlap]: target,
            }));
            where.push(sequelize.where(sequelize.fn('st_distance', target, center, true), {
                [Op.lte]: radius,
            }));
        } else if (params.filter === 'cities') {
            if (!params.cities) {
                return ({
                    count: 0,
                    rows: [],
                });
            }
            const cities = params.cities.split(/,/).map((elm) => `'${elm}'`).join(',');
            where.push(sequelize.literal(`EXISTS (SELECT * FROM areas WHERE jcode IN (${cities}) AND path && the_geom AND ST_Intersects(path, the_geom))`));
        } else if (params.filter === 'crossing') {
            if (!params.searchPath) {
                return ({
                    count: 0,
                    rows: [],
                });
            }
            const linestring = Walk.decodePath(params.searchPath);
            where.push({
                path: {
                    [Op.overlap]: linestring,
                },
            });
            where.push(sequelize.fn('ST_Intersects', sequelize.col('path'), linestring));
        } else if (params.filter === 'hausdorff') {
            if (!params.searchPath) {
                return ({
                    count: 0,
                    rows: [],
                });
            }
            const maxDistance = params.max_distance || 4000;
            const linestring = Walk.decodePath(params.searchPath);
            const extent = Walk.getPathExtent(params.searchPath);
            const dlat = (maxDistance * 180) / Math.PI / Walk.EARTH_RADIUS;
            const mlat = Math.max(Math.abs(extent.ymax + dlat), Math.abs(extent.ymin - dlat));
            const dlon = dlat / Math.cos((mlat / 180) * Math.PI);
            const lb = Walk.getPoint(extent.xmin - dlon, extent.ymin - dlat);
            const rt = Walk.getPoint(extent.xmax + dlon, extent.ymax + dlat);

            attributes.push([`ST_HausdorffDistance(ST_Transform(path, ${Walk.SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${Walk.SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance']);
            where.push(sequelize.fn('ST_Within', sequelize.col('path'), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', lb, rt), Walk.SRID)));
            where.push(sequelize.where(sequelize.fn(
                'ST_HausdorffDistance',
                sequelize.fn('ST_Transform', sequelize.col('path'), Walk.SRID_FOR_SIMILAR_SEARCH),
                sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), Walk.SRID_FOR_SIMILAR_SEARCH),
            ), {
                [Op.lt]: maxDistance,
            }));
        } else if (params.filter === 'frechet') {
            if (!params.searchPath) {
                return ({
                    count: 0,
                    rows: [],
                });
            }
            const maxDistance = params.max_distance || 4000;
            const linestring = Walk.decodePath(params.searchPath);
            const sp = Walk.getStartPoint(params.searchPath);
            const ep = Walk.getEndPoint(params.searchPath);
            const dlat = (maxDistance * 180) / Math.PI / Walk.EARTH_RADIUS;
            const mlat = Math.max(
                Math.abs(sp[1] + dlat),
                Math.abs(sp[1] - dlat),
                Math.abs(ep[1] + dlat),
                Math.abs(ep[1] - dlat),
            );
            const dlon = dlat / Math.cos((mlat / 180) * Math.PI);
            const slb = Walk.getPoint(sp[0] - dlon, sp[1] - dlat);
            const srt = Walk.getPoint(sp[0] + dlon, sp[1] + dlat);
            const elb = Walk.getPoint(ep[0] - dlon, ep[1] - dlat);
            const ert = Walk.getPoint(ep[0] + dlon, ep[1] + dlat);

            attributes.push([`ST_FrechetDistance(ST_Transform(path, ${Walk.SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${Walk.SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance']);
            where.push(sequelize.fn('ST_Within', sequelize.fn('ST_StartPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', slb, srt), Walk.SRID)));
            where.push(sequelize.fn('ST_Within', sequelize.fn('ST_EndPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', elb, ert), Walk.SRID)));
            where.push(sequelize.where(sequelize.fn(
                'ST_FrechetDistance',
                sequelize.fn('ST_Transform', sequelize.col('path'), Walk.SRID_FOR_SIMILAR_SEARCH),
                sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), Walk.SRID_FOR_SIMILAR_SEARCH),
            ), {
                [Op.lt]: maxDistance,
            }));
        }
    }
    if (draftUid !== null) {
        where.push({ [Op.or]: [{ draft: false }, { uid: draftUid }] });
    } else {
        where.push({ draft: false });
    }

    const limit = parseInt(params.limit, 10) || 20;
    const offset = parseInt(params.offset, 10) || 0;

    const result = await Walk.findAndCountAll({
        attributes,
        order: [order],
        where: { [Op.and]: where },
        offset,
        limit,
    });
    let prevId; let
        nextId;
    if (params.id) {
        const nextIds = await sequelize.query(
            draftUid === null ?
                'SELECT id FROM walks where id > ? and draft = ? order by id limit 1' :
                'SELECT id FROM walks where id > ? and (draft = ? or uid = ?) order by id limit 1',
            { replacements: [params.id, false, draftUid], type: sequelize.QueryTypes.SELECT },
        );
        if (nextIds.length > 0) nextId = nextIds[0].id;
        const prevIds = await sequelize.query(
            draftUid === null ?
                'SELECT id FROM walks where id < ? and draft = ? order by id desc limit 1' :
                'SELECT id FROM walks where id < ? and (draft = ? or uid = ?) order by id desc limit 1',
            { replacements: [params.id, false, draftUid], type: sequelize.QueryTypes.SELECT },
        );
        if (prevIds.length > 0) prevId = prevIds[0].id;
        return ({
            count: result.count,
            rows: result.rows.map((row) => row.asObject(true)),
            nextId,
            prevId,
        });
    }
    return ({
        count: result.count,
        offset: result.count > offset + limit ? offset + limit : 0,
        rows: result.rows.map((row) => row.asObject(true)),
    });
};
