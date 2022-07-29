async function connect(){
    if(global.connection && global.connection.state !== 'disconnected')
        return global.connection;

    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection("mysql://root:senha@localhost:3306/hltv");
    console.log("Conectado no MySql!");
    global.connection = connection;
    return connection;
}

async function selectPlayers(conn){
    const [rows] = await conn.query('SELECT * FROM player;');
    return rows;
}
	
async function insertPlayer(player, conn) {
    const sql = 'INSERT INTO player VALUES (?,?,?,?,?,?,?,?);';
    const values = [player.id,
		    player.name,
		    player.age,
		    player.team_id,
		    player.nickname,
		    player.mapsPlayed,
		    player.kd,
		    player.rating];
    return await conn.query(sql, values);
}

async function insertTeam(team_id, fetch, conn) {
    let url = `http://localhost:3000/teams/${team_id}`
    let team = await (await fetch(url)).json();
    const sql = 'INSERT INTO team VALUES (?,?,?,?);';
    const values = [team.id,
		    team.name,
		    team.ranking,
		    team.logo];
    return await conn.query(sql, values);
}

async function addMoreInfo(player_id, fetch, conn) {
    let url = `http://localhost:3000/players/${player_id}`
    let json = await (await fetch(url)).json();
    const sql = `UPDATE player SET image=?, team_id=?, name=?, age=? WHERE id=${player_id}`;
    const values = [json.image, json.team.id, json.name, json.age];
    await conn.query(sql, values);
}

module.exports = {connect, selectPlayers, insertPlayer, addMoreInfo, insertTeam}

