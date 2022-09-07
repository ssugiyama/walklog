const models  = require('./models'),
    Sequelize = require('sequelize'),
    sequelize = models.sequelize,
    Walk      = models.sequelize.models.walks;

const Op = Sequelize.Op;

exports.searchFunc = async params => {
    const orderHash = {
        'newest_first'       : ['date', 'desc'],
        'oldest_first'       : 'date',
        'longest_first'      : ['length', 'desc'],
        'shortest_first'     : 'length',
        'easternmost_first'  : [sequelize.fn('st_xmax', sequelize.col('path')),  'desc'],
        'westernmost_first'  : sequelize.fn('st_xmin', sequelize.col('path')),
        'southernmost_first' : sequelize.fn('st_ymin', sequelize.col('path')),
        'northernmost_first' : [sequelize.fn('st_ymax', sequelize.col('path')), 'desc'],
        'nearest_first'      : sequelize.literal('distance'),
    };
    const where = [];
    const order = orderHash[params.order || 'newest_first'];
    const attributes = ['id', 'date', 'title', 'image', 'comment', 'path', 'length', 'uid'];
    if (params.id) {
        where.push({id: params.id});
    }
    else if (params.date) {
        where.push({date: params.date});
    }
    else {
        if (params.user) {
            where.push({uid: params.user});
        }
        if (params.year) {
            where.push(sequelize.where(sequelize.fn('date_part', 'year', sequelize.col('date')), parseInt(params.year)));
        }
        if (params.month) {
            where.push(sequelize.where(sequelize.fn('date_part', 'month', sequelize.col('date')), parseInt(params.month)));
        }

        if (params.filter == 'neighborhood') {
            const latitude  = parseFloat(params.latitude);
            const longitude = parseFloat(params.longitude);
            const radius    = parseFloat(params.radius);
            const dlat      = radius*180/Math.PI/models.EARTH_RADIUS;
            const mlat      = latitude > 0 ? latitude + dlat : latitude - dlat;
            const dlon      = dlat/Math.cos(mlat/180*Math.PI);
            const center    = Walk.getPoint(longitude, latitude);
            const lb        = Walk.getPoint(longitude-dlon, latitude-dlat);
            const rt        = Walk.getPoint(longitude+dlon, latitude+dlat);
            where.push(sequelize.where(sequelize.fn('st_makebox2d', lb, rt), {
                [Op.overlap]: sequelize.col('path')
            }));
            where.push(sequelize.where(sequelize.fn('st_distance', sequelize.col('path'), center, true), {
                [Op.lte]: radius
            }));
        }
        else if (params.filter == 'cities') {
            if (!params.cities) {
                return({
                    count: 0,
                    rows: []
                });
            }
            const cities = params.cities.split(/,/).map(function (elm) { return `'${elm}'`; }).join(',');
            where.push(sequelize.literal(`EXISTS (SELECT * FROM areas WHERE jcode IN (${cities}) AND path && the_geom AND ST_Intersects(path, the_geom))`));
        }
        else if (params.filter == 'crossing') {
            if (!params.searchPath) {
                return({
                    count: 0,
                    rows: []
                });
            }
            const linestring = Walk.decodePath(params.searchPath);
            where.push({
                path: {
                    [Op.overlap]: linestring
                }
            });
            where.push(sequelize.fn('ST_Intersects', sequelize.col('path'), linestring));
        }
        else if (params.filter == 'hausdorff') {
            if (!params.searchPath) {
                return({
                    count: 0,
                    rows: []
                });
            }
            const maxDistance = params.max_distance || 4000;
            const linestring  = Walk.decodePath(params.searchPath);
            const extent      = Walk.getPathExtent(params.searchPath);
            const dlat        = maxDistance*180/Math.PI/models.EARTH_RADIUS;
            const mlat        = Math.max(Math.abs(extent.ymax + dlat), Math.abs(extent.ymin-dlat));
            const dlon        = dlat/Math.cos(mlat/180*Math.PI);
            const lb          = Walk.getPoint(extent.xmin-dlon, extent.ymin-dlat);
            const rt          = Walk.getPoint(extent.xmax+dlon, extent.ymax+dlat);

            attributes.push([`ST_HausdorffDistance(ST_Transform(path, ${models.SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${models.SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance']);
            where.push(sequelize.fn('ST_Within', sequelize.col('path'), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', lb, rt), models.SRID)));
            where.push(sequelize.where(
                sequelize.fn('ST_HausdorffDistance',
                    sequelize.fn('ST_Transform', sequelize.col('path'), models.SRID_FOR_SIMILAR_SEARCH),
                    sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), models.SRID_FOR_SIMILAR_SEARCH)), {
                    [Op.lt]: maxDistance
                }));
        }
        else if (params.filter == 'frechet') {
            if (!params.searchPath) {
                return({
                    count: 0,
                    rows: []
                });
            }
            const maxDistance = params.max_distance || 4000;
            const linestring  = Walk.decodePath(params.searchPath);
            const sp          = Walk.getStartPoint(params.searchPath);
            const ep          = Walk.getEndPoint(params.searchPath);
            const dlat        = maxDistance*180/Math.PI/models.EARTH_RADIUS;
            const mlat        = Math.max(Math.abs(sp[1] + dlat), Math.abs(sp[1] - dlat), Math.abs(ep[1] + dlat), Math.abs(ep[1] - dlat));
            const dlon        = dlat/Math.cos(mlat/180*Math.PI);
            const slb         = Walk.getPoint(sp[0]-dlon, sp[1]-dlat);
            const srt         = Walk.getPoint(sp[0]+dlon, sp[1]+dlat);
            const elb         = Walk.getPoint(ep[0]-dlon, ep[1]-dlat);
            const ert         = Walk.getPoint(ep[0]+dlon, ep[1]+dlat);

            attributes.push([`ST_FrechetDistance(ST_Transform(path, ${models.SRID_FOR_SIMILAR_SEARCH}), ST_Transform('${linestring}'::Geometry, ${models.SRID_FOR_SIMILAR_SEARCH}))/1000`, 'distance']);
            where.push(sequelize.fn('ST_Within', sequelize.fn('ST_StartPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', slb, srt), models.SRID)));
            where.push(sequelize.fn('ST_Within', sequelize.fn('ST_EndPoint', sequelize.col('path')), sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakeBox2d', elb, ert), models.SRID)));
            where.push(sequelize.where(
                sequelize.fn('ST_FrechetDistance',
                    sequelize.fn('ST_Transform', sequelize.col('path'), models.SRID_FOR_SIMILAR_SEARCH),
                    sequelize.fn('ST_Transform', sequelize.fn('st_geomfromtext', linestring), models.SRID_FOR_SIMILAR_SEARCH)), {
                    [Op.lt]: maxDistance
                }));
        }
    }

    const limit  = parseInt(params.limit) || 20;
    const offset = parseInt(params.offset) || 0;
    try {
        const result = await Walk.findAndCountAll({
            attributes : attributes,
            order  : [order],
            where  : {[Op.and]: where},
            offset : offset,
            limit  : limit,
        });
        let prevId, nextId;
        if (params.id) {
            const  nextIds = await models.sequelize.query('SELECT id FROM walks where id > ? order by id limit 1',
                { replacements: [params.id], type: models.sequelize.QueryTypes.SELECT });
            if (nextIds.length > 0) nextId = nextIds[0].id;
            const prevIds = await models.sequelize.query('SELECT id FROM walks where id < ? order by id desc limit 1',
                { replacements: [params.id], type: models.sequelize.QueryTypes.SELECT });
            if (prevIds.length > 0) prevId = prevIds[0].id;
            return ({
                count:  result.count,
                rows:   result.rows.map(row => row.asObject(true)),
                nextId: nextId,
                prevId: prevId,
            });
        } else {
            return ({
                count:  result.count,
                offset: result.count > offset + limit ? offset + limit : 0,
                rows:   result.rows.map(row => row.asObject(true)),
            });
        }
    } catch(error) {
        throw {error};
    }
};