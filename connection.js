async function connect(){
    if(global.connection && global.connection.state !== 'disconnected')
        return global.connection;

    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'senha',
	database: 'hltv',
	multipleStatements:true});
    console.log("Conectado no MySql!");
    global.conn = connection;
    return connection;
}

module.exports = connect;
