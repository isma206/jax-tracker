export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.RIOT_API_KEY;
  const gameName = '3afrit jax';
  const tagLine = 'filou';
  const region = 'euw1';
  const regionV5 = 'europe';
  const championId = 24;

  try {
    // 1. Riot API — rang, LP, wins, losses, mastery
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

    // 2. Scraping League of Graphs — classement EUW sur Jax
    // L'URL du profil principal (pas la page champion spécifique)
    let euwRank = null;
    try {
      const logUrl = `https://www.leagueofgraphs.com/summoner/euw/3afrit+jax-filou`;
      const logRes = await fetch(logUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        }
      });

      if (logRes.ok) {
        const html = await logRes.text();

        // Pattern trouvé dans les données réelles de LeagueOfGraphs :
        // "Jax: Wins: 53.8% - Played: 26 / " puis le rang est dans le résumé
        // Format : (#65,133) après le champion dans la meta description
        // ou "EUW: 874,183" dans le HTML

        // Cherche le classement EUW global
        const euwMatch = html.match(/EUW[:\s]*([0-9,]+)/i) ||
                         html.match(/\(EUW[:\s]*([0-9,]+)\)/i);

        if (euwMatch) {
          euwRank = euwMatch[1].replace(/,/g, '');
        }

        // Cherche aussi le pattern "(#XXX)" pour le rang sur Jax spécifiquement
        if (!euwRank) {
          // Dans la meta description : "Jax: Wins: XX% - Played: XX (#RANK)"
          const jaxRankMatch = html.match(/Jax[^/]*?\(#([\d,]+)\)/i);
          if (jaxRankMatch) {
            euwRank = jaxRankMatch[1].replace(/,/g, '');
          }
        }

        // Pattern générique pour tout classement numérique EUW
        if (!euwRank) {
          const rankMatch = html.match(/Rank[^(]*\(EUW[^)]*?([0-9,]+)\)/i);
          if (rankMatch) {
            euwRank = rankMatch[1].replace(/,/g, '');
          }
        }
      }
    } catch(e) {
      euwRank = null;
    }

    res.status(200).json({ soloQueue, mastery, euwRank });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
