const HLTV = require('hltv-api').default

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main () {
    const conn = await connect();

    async function insertPlayer(player) {
	const sql = 'INSERT INTO Player VALUES (?,?,?,?,?,?,?);';
	const values = [player.id,
			player.name,
			player.age,
			player.team_id,
			player.nickname,
			player.rating,
			player.image];
	console.log(player);
	console.log("adicionando ", player.nickname);
	return await conn.query(sql, values);
    }
    
    async function insertAllPlayers() {	
	let players = require('./json/players.json');
	players.forEach(( (player) => insertPlayer(player)));
    }

    async function insertPlayerById(player_id) {
	const player = await HLTV.getPlayerById(player_id);
	const sql = `INSERT INTO Player VALUES (?,?,?,?,?,?,?);`;
	const values = [player.id,
			player.name,
			player.age,
			player.team_id,
			player.nickname,
			player.rating,
			player.image];
	await conn.query(sql, values);
    }
    
    async function addMoreInfo(player_id) {
	let json = await HLTV.getPlayerById(player_id);
	const sql = `UPDATE Player SET image=?, team_id=?, name=?, age=? WHERE id=${player_id}`;
	const values = [json.image, json.team.id, json.name, json.age];
	await conn.query(sql, values);
    }

    async function insertTeam(team_id) {
	let team = await HLTV.getTeamById(team_id);
	const sql = 'INSERT INTO Team VALUES (?,?,?,?);';
	const values = [team.id,
			team.name,
			team.ranking || null,
			team.logo];
	return await conn.query(sql, values);
    }
    
    async function checkTeamExists(team_id) {
	let query = `SELECT count(*) as quant FROM Team where id = ${team_id}`
	let [[result]] = await conn.query(query);
	console.log(result);
	if (result.quant == 0) {
	    console.log("adicionando time de id ", team_id);
	    await insertTeam(team_id)
	}
    }

    async function checkPlayerExists(player_id) {
	let query = `SELECT count(*) as quant FROM Player where id = ${player_id}`
	let [[result]] = await conn.query(query);
	if (result.quant == 0) {
	    console.log("adicionando player de id ", player_id);
	    await insertPlayerById(player_id);
	    await addMoreInfo(player_id);
	}
    }

    async function insertAllMatches() {
	let matches = Array.from(new Array(2000), (x, i) => i + 2355153);;
	for (index = matches.length - 1; index > 0; index--) {
	    let match_id = matches[index];
	    
	    console.log("adicionando partida ", match_id);
	    await sleep(250);
	    await insertMatchById(match_id);
	}
    }
    
    async function insertMatchById(match_id) {
	var match = match_id;
	try {
	    match = await HLTV.getMatchById(match_id);
	}
	catch (e) {
	    console.log(e);
	    return
	}
	const map_names_query = "SELECT name, id from Map";
	const [map_names_list] = await conn.query(map_names_query);
	const map_names_dict = Object.assign({}, ...map_names_list.map((x) => ({[x.name]: x.id})));
	const last_map_index_query = "SELECT count(id) as last from MapPlayed";
	const [[last_map_index_l]] = await conn.query(last_map_index_query);
	const last_map_index = last_map_index_l.last;
	
	let match_time = match.time.substr(0, 10) + " " + match.time.substr(11, 12);
	const team_1 = match.teams[0]
	const team_2 = match.teams[1]
	await checkTeamExists(team_1.id);
	await checkTeamExists(team_2.id);
	var match_query = `INSERT INTO \`Match\` VALUES (${match_id}, '${match.event.name}', null, '${match_time}');`
	var player_stats = "INSERT INTO PlayerStatsByMatch VALUES ";
	var vals = [];
	for (team_side = 0; team_side < 2; team_side++) {
	    for (player_number = 0; player_number < 5; player_number++) {
		player = match.teams[team_side].players[player_number];
		await checkPlayerExists(player.id);
		player_sql = `(${player.id}, ${match_id}, ${player.kills}, ${player.deaths}, ${player.rating}, ${player.adr}, ${player.kast}, ${match.teams[team_side].id})`
		vals.push(player_sql);
	    }
	}
	const player_stats_query = player_stats + vals.join(", ") + ";";
	const partakes_query = `INSERT INTO TeamPartakesInMatch VALUES (${team_1.id},${match_id}, ${team_1.result});
          INSERT INTO TeamPartakesInMatch VALUES (${team_2.id}, ${match_id}, ${team_2.result});`
	const maps = match.maps;
	var map_played = "INSERT INTO MapPlayed VALUES ";
	var score = "INSERT INTO Score VALUES ";
	var map_vals = [];
	var score_vals = [];
	for (i=0; i< maps.length; i++) {
	    var map = maps[i];
	    console.log(map);
	    var map_team_1 = map.teams[0];
	    var map_team_2 = map.teams[1];
	    if (map_team_1.name == team_1.name) {
		map_team_1.id = team_1.id;
		map_team_2.id = team_2.id;
	    }
	    else {
		map_team_1.id = team_2.id;
		map_team_2.id = team_1.id;
	    }
	    var team_1_points = map_team_1.result.first.rounds + map_team_1.result.second.rounds + map_team_1.result.ext;
	    var team_2_points = map_team_2.result.first.rounds + map_team_2.result.second.rounds + map_team_2.result.ext;
	    var map_id = map_names_dict[map.name]
	    var map_played_val = `(${last_map_index + i + 1}, ${i+1}, ${map_id}, ${match_id})`;
	    map_vals.push(map_played_val);
	    var pick1 = true;
	    if (!(map.pick == map_team_1.name)) {
		pick1 = false;
	    }
	    var team_1_wins = true;
	    if (team_1_points < team_2_points) team_1_wins = false;
	    var score_v = `(${last_map_index + i + 1}, ${map_team_1.id}, ${pick1},  ${team_1_points}, ${team_1_wins}), (${last_map_index + i + 1}, ${map_team_2.id}, ${!pick1}, ${team_2_points}, ${!team_1_wins})`
	    score_vals.push(score_v)
	}
	var map_query = map_played + map_vals.join(", ") + ";";
	var score_query = score + score_vals.join(", ") + ";";
	var update_query = match_query + " " + player_stats_query + " " + partakes_query + " " + map_query + " "+  score_query;
	await conn.query(update_query);
    }

    
    async function populateDatabase() {
	await insertAllMatches();
    }
    await populateDatabase();
}

main();
