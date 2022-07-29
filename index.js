const db = require("./db");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function show_players (conn){
    const players = await db.selectPlayers(conn);
    console.log(players);
}

async function add_players(conn){
    let players = require('./json/players.json');
    players.forEach(( (player) => db.insertPlayer(player, conn)));
}

async function addinfo(conn) {
    let [players] = await conn.query('SELECT * FROM player where image is NULL');
    for (i = 0; i < players.length; i++) {
	let player = players[i];
	console.log("adicionando ", player.nickname);
	await sleep(300);
	await db.addMoreInfo(player.id, fetch, conn);
    }
}

async function insertAllTeams(conn) {
    let [teams] = await conn.query('SELECT DISTINCT team_id FROM player where team_id is not null');
    for (i = 0; i < teams.length; i++) {
	let team = teams[i];
	console.log("adicionando ", team.team_id);
	await sleep(300);
	await db.insertTeam(team.team_id, fetch, conn);
    }
}

async function main () {
    const conn = await db.connect();
    // await show_players(conn);
    await insertAllTeams(conn);
}

main();
