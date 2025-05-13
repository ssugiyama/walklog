const config: {
    use_env_variable: string, 
    omitNull: boolean,
    attributeBehavior: string,
    dialect: string,
} = {
    use_env_variable: 'DB_URL',
    omitNull: true,
    attributeBehavior: 'unsafe-legacy',
    dialect: 'postgres',
};

export default {
    development: config,
    test: config,
    production: config,
};
