const {
    Model,
} = require('sequelize');

const encoder = require('../path_encoder');

module.exports = (sequelize, DataTypes) => {
    class Area extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate() {
            // define association here
        }

        encodedGeom() {
            return this.the_geom.coordinates.map((polygones) => encoder.encode(polygones[0])).join(' ');
        }

        asObject() {
            return {
                jcode: this.jcode,
                theGeom: this.encodedGeom(),
            };
        }
    }
    Area.init({
        jcode: {
            type: DataTypes.INTEGER,
            primaryKey: true,
        },
        the_geom: DataTypes.BLOB,
    }, {
        sequelize,
        timestamps: false,
        underscored: true,
    });

    return Area;
};
