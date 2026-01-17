/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('walks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.DataTypes.INTEGER,
      },
      date: {
        type: Sequelize.DataTypes.DATEONLY,
        allowNull: false,
      },
      title: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: false,
      },
      comment: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: Sequelize.DataTypes.TEXT,
        allowNull: true,
      },
      length: {
        type: Sequelize.DataTypes.FLOAT,
        allowNull: true,
      },
      draft: {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      path: {
        type: Sequelize.DataTypes.GEOMETRY,
      },
      uid: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DataTypes.DATE,
      },
    })
    await queryInterface.addConstraint('walks', {
      fields: ['path'],
      type: 'CHECK',
      name: 'enforce_dims_path',
      where: Sequelize.literal('st_ndims(path) = 2'),
    })
    await queryInterface.addConstraint('walks', {
      fields: ['path'],
      type: 'CHECK',
      name: 'enforce_geotype_path',
      where: Sequelize.literal('(geometrytype(path) = \'LINESTRING\'::text) OR (path IS NULL)'),
    })
    await queryInterface.addConstraint('walks', {
      fields: ['path'],
      type: 'CHECK',
      name: 'enforce_srid_path',
      where: Sequelize.literal('st_srid(path) = 4326'),
    })
    await queryInterface.addIndex('walks', {
      fields: ['date'],
    })
    await queryInterface.addIndex('walks', {
      fields: ['draft'],
    })
    await queryInterface.addIndex('walks', {
      fields: ['path'],
      using: 'GIST',
    })
  },
  async down(queryInterface) {
    await queryInterface.dropTable('walks')
  },
}
