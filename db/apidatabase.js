require('dotenv').config();

const {Pool}=require('pg')
const pool = new Pool({

    host: process.env.apiDB_HOST,
    port: process.env.apiDB_PORT,
    user: process.env.apiDB_USER,
    password: process.env.apiDB_PASSWORD,
    database: process.env.apiDB_NAME

})

module.exports = {
  query: (text, params) => pool.query(text, params),
};

pool.connect().then(() => console.log("Connected to PostgreSQL Partner database"))
