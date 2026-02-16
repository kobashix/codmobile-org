export async function onRequest(context) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; 
  const calculatedSeason = (currentMonth % 12) + 1; 
  const seasonName = `SEASON ${calculatedSeason} LIVE`;

  // CONFIGURATION
  const redditNew = "https://www.reddit.com/r/CallOfDutyMobile/search.json?q=flair%3A%22Redeem+Code%22&restrict_sr=1&sort=new&limit=10";
  const redditTop = "https://www.reddit.com/r/CallOfDutyMobile/search.json?q=flair%3A%22Community+Highlight%22&restrict_sr=1&sort=top&t=year&limit=25";
  const activisionUrl = "https://support.activision.com/cod-mobile/articles/call-of-duty-mobile-updates";
  const youtubeUrl = "https://www.youtube.com/hashtag/codmobile_partner";
  // NEW: Google News RSS for Broad Web Scraping
  const googleNewsUrl = "https://news.google.com/rss/search?q=Call+of+Duty+Mobile+updates+loadouts+guides&hl=en-US&gl=US&ceid=US:en";
  
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

    // A. PROCESS GOOGLE NEWS (WEB LINKS)
    if (newsRes.ok) {
        const xml = await newsRes.text();
        // Regex XML Parser for Worker Environment
        const items = xml.match(/<item>[\s\S]*?<\/item>/g);
        if (items) {
            items.slice(0, 40).forEach(item => {
                const title = item.match(/<title>(.*?)<\/title>/)?.[1];
                const link = item.match(/<link>(.*?)<\/link>/)?.[1];
                const dateStr = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
                const source = item.match(/<source.*?>(.*?)<\/source>/)?.[1] || "Web News";

                if (title && link) {
                    history.push({
                        title: title.replace(" - " + source, ""), // Clean title
                        url: link,
                        date: new Date(dateStr).toLocaleDateString(),
                        type: "WEB INTEL", // Search Category
                        source: source
                    });
                }
            });
        }
    }

    // B. PROCESS YOUTUBE
    if (youtubeRes.ok) {
        const ytText = await youtubeRes.text();
        const videoIdMatch = ytText.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (videoIdMatch) {
            const vidId = videoIdMatch[1];
            try {
                const vidPageRes = await fetch(`https://www.youtube.com/watch?v=${vidId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (vidPageRes.ok) {
                    const vidText = await vidPageRes.text();
                    const title = vidText.match(/<meta name="title" content="(.*?)">/)?.[1] || "Intel Briefing";
                    const desc = vidText.match(/<meta name="description" content="(.*?)">/)?.[1] || "";
                    const views = vidText.match(/<meta itemprop="interactionCount" content="(.*?)">/)?.[1] || "0";
                    const date = vidText.match(/<meta itemprop="datePublished" content="(.*?)">/)?.[1] || today.toISOString();
                    const tags = vidText.match(/<meta name="keywords" content="(.*?)">/)?.[1] || "CODM, Season " + calculatedSeason;

                    videoIntel = { id: vidId, title: title, url: `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0`, thumbnail: `https://img.youtube.com/vi/${vidId}/maxresdefault.jpg`, author: "CODM Partner", views: Number(views).toLocaleString(), uploadDate: date, description: desc, tags: tags.split(',').slice(0, 8) };
                }
            } catch (e) {}
        }
    }

    // C. PROCESS REDDIT
    const processReddit = async (res, isHistory) => {
        if (res.ok) {
            const json = await res.json();
            json.data.children.forEach(post => {
                const p = post.data;
                history.push({
                    title: p.title,
                    url: p.url,
                    score: p.score,
                    date: new Date(p.created_utc * 1000).toLocaleDateString(),
                    type: isHistory ? "REDDIT ARCHIVE" : "REDDIT LIVE",
                    source: `r/${p.subreddit}`
                });

                const codeRegex = /\b[A-Z0-9]{10,14}\b/g;
                const found = (p.title + p.selftext).match(codeRegex);
                if (found) {
                    found.forEach(code => {
                        if (!codes.find(c => c.code === code)) codes.push({ code: code, reward: "Community Found", source: "Reddit" });
                    });
                }
            });
        }
    };

    await Promise.all([processReddit(redNewRes, false), processReddit(redTopRes, true)]);

    // D. PROCESS ACTIVISION
    if (activisionRes.ok) {
        const text = await activisionRes.text();
        const versionMatch = text.match(/Version\s+\d+\.\d+.*?(?=Version|$)/gs);
        if (versionMatch) {
            const latestBlock = versionMatch[0];
            const title = latestBlock.split('\n')[0].replace(/<[^>]*>/g, '').trim();
            const descMatch = latestBlock.match(/<li>(.*?)<\/li>|<p>(.*?)<\/p>/);
            const desc = descMatch ? (descMatch[1] || descMatch[2]).replace(/<[^>]*>/g, '').trim() : "Check official site.";
            patchNotes.push({ title: title, desc: desc });
            
            const subHeaderMatch = latestBlock.match(/<strong>(.*?)<\/strong>/g);
            if(subHeaderMatch) {
                subHeaderMatch.slice(0,3).forEach(h => {
                    patchNotes.push({ title: h.replace(/<[^>]*>/g, ''), desc: "Detailed update available in full patch notes." });
                });
            }
        }
    }

  } catch (err) { console.log("Scrape Error", err); }

  // 3. FALLBACKS
  if (codes.length === 0) codes = [{ code: "BVRPZBZJ53", reward: "Verified Code", source: "Backup" }];
  
  if (patchNotes.length === 0) {
      patchNotes = [
          { title: "Version 35.0 — December 8, 2025", desc: "Overall app optimizations to reduce storage space and improve download speeds." },
          { title: "Storage Optimization", desc: "Android size reduced to ~1.6 GB. iOS size reduced to ~3.3 GB." },
          { title: "DMZ Recon", desc: "The new DMZ Recon game mode will be downloaded as part of Version 35.0." },
          { title: "Battle Royale", desc: "Isolated map requires new high-definition audio assets download." }
      ];
  }

  // 4. RESPONSE
  const data = {
    status: seasonName,
    hero: {
      subtitle: `AUTOMATED INTEL // ${today.toLocaleDateString()}`,
      title: `META <span style="color:var(--cod-red)">WATCH</span>`,
      desc: `Real-time surveillance of Season ${calculatedSeason}. Scanning Activision, YouTube, Reddit & Global News streams.`,
    },
    tierList: [
        { tier: "S+", name: "BP50", type: "AR", analysis: "High Fire Rate. Consistent Meta." },
        { tier: "S", name: "LAG 53", type: "AR", analysis: "New Season Favorite." },
        { tier: "S", name: "USS 9", type: "SMG", analysis: "Close Range King." },
        { tier: "A", name: "Tundra", type: "Sniper", analysis: "Aggressive Sniping." }
    ],
    codes: codes,
    patchNotes: patchNotes,
    video: videoIntel,
    history: history 
  };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}

function getYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}