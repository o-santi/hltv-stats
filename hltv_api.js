const HLTV = require('hltv-api').default
const express = require('express')
const app = express()

app.get('/', async (req, res) => {
  const news = await HLTV.getNews()
  res.json(news)
})

app.get('/matches', async (req, res) => {
  const matches = await HLTV.getMatches()
  res.json(matches)
})

app.get('/results/:matchId/stats', async (req, res) => {
  const stats = await HLTV.getMatchById(req.params.matchId)
  res.json(stats)
})
app.get('/players', async (req, res) => {
  const players = await HLTV.getTopPlayers()
  res.json(players)
})
app.get('/players/:playerId', async (req, res) => {
  const player = await HLTV.getPlayerById(req.params.playerId)
  res.json(player)
})

app.get('/top-teams', async (req, res) => {
  const teams = await HLTV.getTopTeams()
  res.json(teams)
})

app.get('/teams/:teamId', async (req, res) => {
  const team = await HLTV.getTeamById(req.params.teamId)
  res.json(team)
})

app.get('/results', async (req, res) => {
  const results = await HLTV.getResults()
  res.json(results)
})


app.listen(3000, () => {
  console.log('Listening...')
})

