export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Mode debug : affiche les 2000 premiers caractères du HTML reçu
  if (req.query.debug === '1') {
    try {
      const logUrl = `https://www.leagueofgraphs.com/fr/summoner/champions/jax/euw/3afrit+jax-filou/soloqueue`;
      const logRes = await fetch(logUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        }
      });
      const html = await logRes.text();
      // Cherche le mot "solo-number" pour voir si la classe est présente
      const idx = html.indexOf('solo-number');
      const snippet = idx >= 0 ? html.slice(Math.max(0, idx - 100), idx + 500) : html.slice(0, 2000);
      return res.status(200).json({ status: logRes.status, found: idx >= 0, snippet });
    } catch(e) {
      return res.status(200).json({ error: e.message });
    }
  }

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

    const rankedRes = await fetch(
      `https://${region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}?api_key=${apiKey}`
    );
    if (!rankedRes.ok) throw new Error(`Ranked error ${rankedRes.status}`);
    const ranked = await rankedRes.json();

    const masteryRes = await fetch(
      `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}/by-champion/${championId}?api_key=${apiKey}`
    );
    const mastery = masteryRes.ok ? await masteryRes.json() : null;
    const soloQueue = ranked.find(q => q.queueType === 'RANKED_SOLO_5x5') || null;

    let euwRank = null;
    let worldRank = null;
    try {
      const logUrl = `https://www.leagueofgraphs.com/fr/summoner/champions/jax/euw/3afrit+jax-filou/soloqueue`;
      const logRes = await fetch(logUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        }
      });
      if (logRes.ok) {
        const html = await logRes.text();
        const blockRegex = /class="number-medium solo-number"[\s\S]{0,20}?#([\d,]+)[\s\S]{0,500}?<div class="title">([\s\S]{0,100}?)<\/div>/g;
        let match;
        while ((match = blockRegex.exec(html)) !== null) {
          const number = match[1].replace(/,/g, '');
          const label = match[2].trim();
          if (label.includes('EUW')) euwRank = number;
          if (label.includes('Mondial') || label.includes('World')) worldRank = number;
        }
      }
    } catch(e) {}

    res.status(200).json({ soloQueue, mastery, euwRank, worldRank });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
