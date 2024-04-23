const config = {
    use_env_variable: 'DB_URL',
    omitNull: true,
};

module.exports = {
    development: config,
    test: config,
    production: config,
};
