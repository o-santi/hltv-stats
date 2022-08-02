const connection = require("./connection");
const express = require('express');
const exphbs = require('express-handlebars');
const session = require('express-session');
const bodyParser = require("body-parser");

var app = express();

app._conn = false;

var hbs = exphbs.create({
    helpers: {
	par: (x) => x % 2,
	bigger: (x, y) => x > y,
	compare_match: (x, y) => {
	    if (x >y) return "DarkSeaGreen";
	    else if (y > x) return "DarkSalmon";
	    else return "gray";
	},
	compare_result: (x, y) => {
	    if (x >y) return "green";
	    else if (y > x) return "red";
	    else return "gray";
	}
    },
    layoutsDir: __dirname + '/views/layouts',
    defaultLayout: 'main',
    extname: '.hbs'
})

app.use(express.static('public'), session({secret: 'mySecret', resave: false, saveUninitialized: false}));

app.engine('hbs', hbs.engine);

app.set('view engine', 'hbs');

app.use(bodyParser.urlencoded({
    extended: true
}))

app.use(bodyParser.json())

app.get('/', (req, res) => {
    let searching = req.session.searching || false;
    let query_name = req.session.query_name || "";
    let players = req.session.players || [];
    let teams = req.session.teams || [];
    res.render('index',
	       {players: players,
		teams: teams,
		searching: searching,
		query_name: query_name,
		teams_result_quant: teams.length,
	        player_result_quant: players.length,
	       });
});

app.post('/search/', async (req, res) => {
    let query_name = req.body.query_name;
    let sql_query = `
    SELECT image, name, nickname, id FROM Player WHERE name like '${query_name}%' union SELECT image, name, nickname, id FROM Player WHERE nickname like '${query_name}%';
    SELECT logo as image, name, id FROM Team WHERE name like '${query_name}%';`;
    let [result] = await app._conn.query(sql_query)
    let [players, teams] = result;
    console.log(players, teams);
    req.session.query_name = query_name;
    req.session.players = players;
    req.session.teams = teams;
    req.session.searching = true;
    res.redirect('/');
});

app.get('/player/:player_id', async (req, res) => {
    let player_id = req.params.player_id;
    let sql_query = `
      SELECT * FROM Player WHERE Player.id = ${player_id};
      SELECT Team.name, Team.id FROM Team INNER JOIN Player ON team_id = Team.id WHERE Player.id = ${player_id};
      SELECT avg(adr) as avg_adr FROM PlayerStatsByMatch INNER JOIN Player on player_id = Player.id INNER JOIN \`Match\` on match_id = Match.id WHERE Player.id = ${player_id};
      SELECT sum(kills) as sum_kills FROM PlayerStatsByMatch INNER JOIN Player on player_id = Player.id INNER JOIN \`Match\` on match_id = Match.id WHERE Player.id = ${player_id};
      SELECT sum(deaths) as sum_deaths FROM PlayerStatsByMatch INNER JOIN Player on player_id = Player.id INNER JOIN \`Match\` on match_id = Match.id WHERE Player.id = ${player_id};
      SELECT Match.id, Match.eventName, Match.DateTime, Enemy.name as enemy_name, Enemy.logo as enemy_logo, Enemy.id as enemy_id, PlayerTeam.name as team_name, PlayerTeam.logo as team_logo, PlayerTeam.id as team_id, EnemyPartakes.mapsWon as enemy_maps, TeamPartakes.mapsWon as team_maps
      FROM PlayerStatsByMatch 
      INNER JOIN Player ON player_id = Player.id
      INNER JOIN \`Match\` ON PlayerStatsByMatch.match_id = Match.id
      INNER JOIN TeamPartakesInMatch AS EnemyPartakes ON EnemyPartakes.match_id = Match.id
      INNER JOIN Team AS Enemy ON EnemyPartakes.team_id = Enemy.id
      INNER JOIN Team AS PlayerTeam ON PlayerStatsByMatch.team_id = PlayerTeam.id
      INNER JOIN TeamPartakesInMatch AS TeamPartakes ON TeamPartakes.match_id = Match.id AND TeamPartakes.team_id = PlayerTeam.id
      WHERE Player.id = ${player_id} AND Enemy.id <> PlayerTeam.id
      ORDER BY Match.DateTime DESC;
      SELECT count(match_id) as match_count FROM Player LEFT OUTER JOIN PlayerStatsByMatch on Player.id = player_id;
    `;
    let [results] = await app._conn.query(sql_query);
    let [[player], [team], [adr], [kills], [deaths], [partidas_count], matches, [match_count]] = results;
    for (var i = 0; i < matches.length; i++){
	match = matches[i]
	match.date = match.DateTime.toLocaleString("pt-BR", {day:'2-digit', month:'2-digit', year:'2-digit', hour: '2-digit', minute:'2-digit'});
    }
    res.render('player',
	       {player: player,
		team: team,
		adr: parseFloat(adr.avg_adr).toFixed(2),
		kills: kills.sum_kills,
		deaths : deaths.sum_deaths,
		matches : matches,
		partidas_quant: match_count.match_count,
	       })
})


app.get('/team/:team_id', async (req, res) => {
    let team_id = req.params.team_id;
    let query = `
      SELECT * FROM Team WHERE Team.id = ${team_id};
      SELECT Player.id, Player.image, Player.nickname FROM (Player inner join Team on team_id = Team.id) WHERE Team.id = ${team_id};
      SELECT Match.id, Match.eventName, Match.DateTime, Enemy.name as enemy_name, Enemy.logo as enemy_logo, Enemy.id as enemy_id, Team.name as team_name, Team.logo as team_logo, Team.id as team_id, EnemyPartakes.mapsWon as enemy_maps, TeamPartakes.mapsWon as team_maps
      FROM Team
      INNER JOIN TeamPartakesInMatch AS TeamPartakes ON TeamPartakes.team_id = Team.id
      INNER JOIN TeamPartakesInMatch AS EnemyPartakes ON EnemyPartakes.match_id = TeamPartakes.match_id
      INNER JOIN Team AS Enemy ON EnemyPartakes.team_id = Enemy.id
      INNER JOIN \`Match\` ON Match.id=TeamPartakes.match_id 
      WHERE Team.id = ${team_id} AND Enemy.id <> Team.id
      ORDER BY Match.DateTime DESC;
   `;
   
    let [result] = await app._conn.query(query)
    let [[team], players, matches] = result;
    for (var i = 0; i < matches.length; i++){
	match = matches[i]
	match.date = match.DateTime.toLocaleString("pt-BR", {day:'2-digit', month:'2-digit', year:'2-digit', hour: '2-digit', minute:'2-digit'});
    }
    console.log(players);
    res.render('team',
	       {team: team,
		players: players,
		matches: matches
	       });
})

app.get('/match/:match_id', async (req, res) => {
    let match_id = req.params.match_id;
    let first_query = `SELECT Team.id, Team.name, Team.logo, TeamPartakesInMatch.mapsWon, Match.eventName, Match.DateTime
    FROM \`Match\` INNER JOIN TeamPartakesInMatch ON TeamPartakesInMatch.match_id = Match.id AND Match.id = ${match_id}
    INNER JOIN Team ON Team.id = TeamPartakesInMatch.team_id;`
    let [teams] = await app._conn.query(first_query);
    let team1 = teams[0]
    let team2 = teams[1]
    let second_query = `
    SELECT Player.nickname, Player.id as player_id, Stats.kills, Stats.deaths, 
    Stats.rating, Stats.ADR, Stats.kast
    FROM \`Match\` INNER JOIN PlayerStatsByMatch AS Stats ON Stats.match_id = Match.id
    INNER JOIN Player ON Stats.player_id = Player.id
    WHERE Match.id = ${match_id} and Stats.team_id=${team1.id}
    ORDER BY rating DESC; 

    SELECT Player.nickname, Player.id as player_id, Stats.kills, Stats.deaths, 
    Stats.rating, Stats.ADR, Stats.kast
    FROM \`Match\` INNER JOIN PlayerStatsByMatch AS Stats ON Stats.match_id = Match.id
    INNER JOIN Player ON Stats.player_id = Player.id
    WHERE Match.id = ${match_id} and Stats.team_id=${team2.id}
    ORDER BY rating DESC; 

    SELECT Map.name as map_name, Map.abbreviation, MapPlayed.order, T1.name as team1_name, ScoreT1.points as team1_points, ScoreT1.pick, ScoreT1.win, T2.name as team2_name, ScoreT2.points as team2_points
    FROM MapPlayed INNER JOIN Score AS ScoreT1 
    ON ScoreT1.mapPlayed_id = MapPlayed.id AND ScoreT1.team_id = ${team1.id}
    INNER JOIN Team AS T1 ON ScoreT1.team_id = T1.id 
    INNER JOIN Map ON MapPlayed.map_id = Map.id 
    INNER JOIN \`Match\` ON MapPlayed.match_id = Match.id AND Match.id = ${match_id}
    INNER JOIN Score AS ScoreT2 
    ON ScoreT2.mapPlayed_id = MapPlayed.id AND ScoreT2.team_id = ${team2.id}
    INNER JOIN Team AS T2 ON ScoreT2.team_id = T2.id
    ORDER BY MapPlayed.order ASC;

    SELECT P.nickname, PMS.kills, PMS.deaths, PMS.rating
    FROM PlayerStatsByMatch AS PMS INNER JOIN Player AS P ON PMS.player_id = P.id
    INNER JOIN \`Match\` AS M ON PMS.match_id = M.id
    WHERE PMS.match_id = ${match_id}
    AND   PMS.rating >= ALL (SELECT rating FROM PlayerStatsByMatch AS subPMS INNER JOIN
                  \`Match\` AS subM ON subPMS.match_id = subM.id WHERE subPMS.match_id = ${match_id});
`;
    let [result] = await app._conn.query(second_query)
    let [team1_players, team2_players, map_result, [mvp]] = result;
    team1.players = team1_players;
    team2.players = team2_players;
    let teams_info = [team1, team2]
    date = team1.DateTime.toLocaleString("pt-BR", {day:'2-digit', month:'2-digit', year:'2-digit', hour: '2-digit', minute:'2-digit'});
    map_result.mvp = mvp;
    res.render('match',
	       {teams: teams_info,
		map_result: map_result,
		date: date
	       });
})

// port where app is served
app.listen(3000, async () => {
    app._conn = await connection();
})
