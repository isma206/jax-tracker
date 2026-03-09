export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.RIOT_API_KEY;
  const gameName = '3afrit jax';
  const tagLine = 'filou';
  const region = 'euw1';
  const regionV5 = 'europe';
  const championId = 24;

  try {
    const accountRes = await fetch(
      `https://${regionV5}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`
    );
    if (!accountRes.ok) throw new Error(`Account error ${accountRes.status}`);
    const account = await accountRes.json();

    const summonerRes = await fetch(
      `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${apiKey}`
    );
    if (!summonerRes.ok) throw new Error(`Summoner error ${summonerRes.status}`);
    const summoner = await summonerRes.json();

    const rankedRes = await fetch(
      `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summoner.id}?api_key=${apiKey}`
    );
    if (!rankedRes.ok) throw new Error(`Ranked error ${rankedRes.status}`);
    const ranked = await rankedRes.json();

    const masteryRes = await fetch(
      `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}/by-champion/${championId}?api_key=${apiKey}`
    );
    const mastery = masteryRes.ok ? await masteryRes.json() : null;

    const soloQueue = ranked.find(q => q.queueType === 'RANKED_SOLO_5x5') || null;

    res.status(200).json({ soloQueue, mastery });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
