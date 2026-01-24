import { QueryInterface, DataTypes, Sequelize } from 'sequelize'

/** @type {import('sequelize-cli').Migration} */

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable('walks', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    length: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    draft: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    path: {
      type: DataTypes.GEOMETRY,
    },
    uid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updated_at: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  })
  await queryInterface.addConstraint('walks', {
    fields: ['path'],
    type: 'check',
    name: 'enforce_dims_path',
    where: Sequelize.literal('st_ndims(path) = 2'),
  })
  await queryInterface.addConstraint('walks', {
    fields: ['path'],
    type: 'check',
    name: 'enforce_geotype_path',
    where: Sequelize.literal('(geometrytype(path) = \'LINESTRING\'::text) OR (path IS NULL)'),
  })
  await queryInterface.addConstraint('walks', {
    fields: ['path'],
    type: 'check',
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
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable('walks')
}
