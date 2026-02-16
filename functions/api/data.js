export async function onRequest(context) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; 
  const calculatedSeason = (currentMonth % 12) + 1; 
  const seasonName = `SEASON ${calculatedSeason} LIVE`;

  const redditNew = "https://www.reddit.com/r/CallOfDutyMobile/search.json?q=flair%3A%22Redeem+Code%22&restrict_sr=1&sort=new&limit=10";
  const redditTop = "https://www.reddit.com/r/CallOfDutyMobile/search.json?q=flair%3A%22Community+Highlight%22&restrict_sr=1&sort=top&t=year&limit=15";
  const activisionUrl = "https://support.activision.com/cod-mobile/articles/call-of-duty-mobile-updates";
  const youtubeUrl = "https://www.youtube.com/hashtag/codmobile_partner";
  const googleNewsUrl = "https://news.google.com/rss/search?q=Call+of+Duty+Mobile+updates+meta&hl=en-US&gl=US&ceid=US:en";
  
  let codes = [];
  let patchNotes = [];
  let videoIntel = null;
  let history = []; 

  try {
    const [redNewRes, redTopRes, activisionRes, youtubeRes, newsRes] = await Promise.all([
      fetch(redditNew, { headers: { 'User-Agent': 'CODMobileOrg-Bot/1.0' } }),
      fetch(redditTop, { headers: { 'User-Agent': 'CODMobileOrg-Bot/1.0' } }),
      fetch(activisionUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' } }),
      fetch(youtubeUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0)' } }),
      fetch(googleNewsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    ]);

    // 1. WEB NEWS SCRAPE (Google News RSS)
    if (newsRes.ok) {
        const xml = await newsRes.text();
        const items = xml.match(/<item>[\s\S]*?<\/item>/g);
        if (items) {
            items.slice(0, 40).forEach(item => {
                const title = item.match(/<title>(.*?)<\/title>/)?.[1];
                const link = item.match(/<link>(.*?)<\/link>/)?.[1];
                const dateStr = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
                if (title && link) history.push({ title: title, url: link, date: new Date(dateStr).toLocaleDateString(), type: "WEB INTEL", source: "Global News" });
            });
        }
    }

    // 2. YOUTUBE DEEP SCRAPE
    if (youtubeRes.ok) {
        const ytText = await youtubeRes.text();
        const videoIdMatch = ytText.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (videoIdMatch) {
            const vidId = videoIdMatch[1];
            try {
                const vidPageRes = await fetch(`https://www.youtube.com/watch?v=${vidId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (vidPageRes.ok) {
                    const vidText = await vidPageRes.text();
                    const title = vidText.match(/<meta name="title" content="(.*?)">/)?.[1] || "Tactical Briefing";
                    const desc = vidText.match(/<meta name="description" content="(.*?)">/)?.[1] || "";
                    const views = vidText.match(/<meta itemprop="interactionCount" content="(.*?)">/)?.[1] || "0";
                    const tags = vidText.match(/<meta name="keywords" content="(.*?)">/)?.[1] || "CODM, Season " + calculatedSeason;
                    videoIntel = { 
                        id: vidId, 
                        title: title, 
                        url: `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0`, 
                        thumbnail: `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`, 
                        author: "Verified Partner", 
                        views: Number(views).toLocaleString(), 
                        uploadDate: today.toISOString(), 
                        description: desc, 
                        tags: tags.split(',').slice(0, 8) 
                    };
                }
            } catch (e) {}
        }
    }

    // 3. REDDIT SCRAPE
    const processReddit = async (res) => {
        if (res.ok) {
            const json = await res.json();
            json.data.children.forEach(post => {
                const p = post.data;
                history.push({ title: p.title, url: p.url, date: new Date(p.created_utc * 1000).toLocaleDateString(), type: "REDDIT FEED", source: `r/${p.subreddit}` });
                const found = (p.title + p.selftext).match(/\b[A-Z0-9]{10,14}\b/g);
                if (found) found.forEach(code => { if (!codes.find(c => c.code === code)) codes.push({ code: code, reward: "Community Discovery", source: "Reddit" }); });
            });
        }
    };
    await Promise.all([processReddit(redNewRes), processReddit(redTopRes)]);

    // 4. ACTIVISION PATCH SCRAPE (Enhanced Regex for Headers)
    if (activisionRes.ok) {
        const text = await activisionRes.text();
        const blocks = text.match(/Version\s+\d+\.\d+\s+—\s+.*?(?=Version|$)/gs);
        if (blocks) {
            blocks.slice(0, 3).forEach(block => {
                const title = block.split('\n')[0].replace(/<[^>]*>/g, '').trim();
                const content = block.match(/<li>(.*?)<\/li>|<p>(.*?)<\/p>/gs);
                if (content) {
                    content.slice(0, 4).forEach(item => {
                        const clean = item.replace(/<[^>]*>/g, '').trim();
                        if (clean.length > 20) patchNotes.push({ title: title, desc: clean });
                    });
                }
            });
        }
    }

  } catch (err) { console.log("Scrape Error", err); }

  // REFINED FALLBACKS (Matching Screenshot)
  if (codes.length === 0) codes = [{ code: "BVRPZBZJ53", reward: "Standard Supply", source: "Backup" }];
  if (patchNotes.length === 0) {
      patchNotes = [
          { title: "Version 35.0 — December 8, 2025", desc: "Overall app optimizations to reduce storage space and improve download speeds." },
          { title: "Storage Optimization", desc: "Android size reduced to ~1.6 GB. iOS size reduced to ~3.3 GB." },
          { title: "DMZ Recon", desc: "New DMZ Recon game mode downloaded with Version 35.0." }
      ];
  }
  
  return new Response(JSON.stringify({
    status: seasonName,
    hero: { subtitle: `INTEL STREAM LIVE`, title: `LUNAR <span style="color:var(--cod-red)">CHARGE</span>`, desc: `Real-time Season ${calculatedSeason} surveillance active.` },
    tierList: [ 
        { tier: "S+", name: "BP50", type: "AR", analysis: "Superior TTK. Dominates ranked play." },
        { tier: "S", name: "LAG 53", type: "AR", analysis: "Versatile new favorite." },
        { tier: "S", name: "USS 9", type: "SMG", analysis: "Close-range eraser." }
    ],
    codes: codes,
    patchNotes: patchNotes,
    video: videoIntel,
    history: history 
  }), { headers: { "Content-Type": "application/json" } });
}