const db = require("./db");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function show_players (conn){
    const players = await db.selectPlayers(conn);
    console.log(players);
}

async function add_players(conn) {
    let players = require('./json/players.json');
    players.forEach(( (player) => db.insertPlayer(player, conn)));
}

async function updatePlayersInfo(conn) {
    let [players] = await conn.query('SELECT * FROM player where image is NULL');
    for (i = 0; i < players.length; i++) {
	let player = players[i];
	console.log("adicionando ", player.nickname);
	await sleep(300);
	await db.addMoreInfo(player.id, conn);
    }
}

async function insertAllTeams(conn) {
    let [teams] = await conn.query('SELECT DISTINCT team_id FROM player where team_id is not null');
    for (i = 0; i < teams.length; i++) {
	let team = teams[i];
	console.log("adicionando ", team.team_id);
	await sleep(300);
	await db.insertTeam(team.team_id, conn);
    }
}
    
async function insertAllMatches(conn) {
    let [matches] = require('./json/matches.json');
    for (i = 0; i < matches.length; i++) {
	let match = match[i]
	console.log("adicionando ", match.id);
	await sleep(300);
	await db.insertMatch(match.id, conn);
    }
}

async function populateDatabase(conn) {
    await add_players(conn);
    await updatePlayersInfo(conn);
    await insertAllTeams(conn);
}

async function main () {
    const conn = await db.connect();
    // await show_players(conn);
    // await insertAllTeams(conn);
    await insertAllMatches(conn);
}

main();
{"id":2357580,
 "time":"2022-07-29T10:00:00.000Z",
 "event":{"name":"Esport Adria Championship Season 6 Finals","logo":"https://img-cdn.hltv.org/eventlogo/Ob1Z1Shur7mFQOHwmr7vrI.png?ixlib=java-2.1.0&w=50&s=a6a843ef26124b8f0f7276be4a4db72c"},
 "stars":0,
 "maps":"bo3",
 "teams":[{"id":10697,
	   "name":"BLINK",
	   "logo":"https://img-cdn.hltv.org/teamlogo/5NRu_RnNWb40s1OwgfNn76.png?ixlib=java-2.1.0&w=50&s=752a7ab012ddeeae71b5970a3b217c54"},
	  {"id":11813,
	   "name":"ex-4glory",
	   "logo":"/img/static/team/placeholder.svg"}]}
