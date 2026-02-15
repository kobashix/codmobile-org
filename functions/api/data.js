export async function onRequest(context) {
  // 1. DYNAMIC SEASON CALCULATOR
  const today = new Date();
  const currentMonth = today.getMonth() + 1; 
  const calculatedSeason = (currentMonth % 12) + 1; 
  const seasonName = `SEASON ${calculatedSeason} LIVE`;

  // 2. SCRAPE CONFIGURATION
  const redditUrl = "https://www.reddit.com/r/CallOfDutyMobile/search.json?q=title%3A%22code%22+OR+flair%3A%22Redeem+Code%22&restrict_sr=1&sort=new&limit=5";
  const activisionUrl = "https://support.activision.com/cod-mobile/articles/call-of-duty-mobile-updates";
  
  let codes = [];
  let patchNotes = [];
  let videoIntel = null;

  // --- PARALLEL FETCHING ---
  try {
    const [redditRes, activisionRes] = await Promise.all([
      fetch(redditUrl, { headers: { 'User-Agent': 'CODMobileOrg-Bot/1.0' } }),
      fetch(activisionUrl, { headers: { 'User-Agent': 'CODMobileOrg-Bot/1.0' } })
    ]);

    // A. PROCESS REDDIT (Codes & Video)
    if (redditRes.ok) {
      const json = await redditRes.json();
      json.data.children.forEach(post => {
        const p = post.data;
        
        // 1. Extract Codes
        const codeRegex = /\b[A-Z0-9]{10,14}\b/g;
        const found = (p.title + p.selftext).match(codeRegex);
        if (found) {
          found.forEach(code => {
            if (!codes.find(c => c.code === code)) {
              codes.push({ code: code, reward: "Community Found", source: "Reddit" });
            }
          });
        }

        // 2. Extract YouTube Video (Tactical Briefing)
        if (!videoIntel && (p.url.includes('youtube.com') || p.url.includes('youtu.be'))) {
            videoIntel = {
                title: p.title.substring(0, 50) + "...",
                url: p.url,
                thumbnail: `https://img.youtube.com/vi/${getYouTubeID(p.url)}/maxresdefault.jpg`,
                desc: "Trending on r/CallOfDutyMobile"
            };
        }
      });
    }

    // B. PROCESS ACTIVISION (Patch Notes)
    // Basic HTML parsing since we can't use DOMParser in Worker
    if (activisionRes.ok) {
        const text = await activisionRes.text();
        // Look for list items <li> that contain typical patch note keywords
        const listItems = text.match(/<li>(.*?)<\/li>/g);
        
        if (listItems) {
            let count = 0;
            listItems.forEach(item => {
                if (count >= 5) return;
                // Clean HTML tags
                const cleanText = item.replace(/<\/?li>/g, '').replace(/<[^>]*>/g, '').trim();
                // Filter for meaningful updates
                if (cleanText.length > 20 && (cleanText.includes("New") || cleanText.includes("Weapon") || cleanText.includes("Map"))) {
                    patchNotes.push({
                        title: "Official Update",
                        desc: cleanText
                    });
                    count++;
                }
            });
        }
    }

  } catch (err) {
    console.log("Scrape Error", err);
  }

  // 3. FALLBACKS
  if (codes.length === 0) {
    codes = [
        { code: "BVRPZBZJ53", reward: "Verified Code", source: "Backup" },
        { code: "BMRMZBZESA", reward: "Verified Code", source: "Backup" }
    ];
  }

  if (patchNotes.length === 0) {
      patchNotes = [
          { title: "Manual Override", desc: "Unable to parse live Activision data. Check official support page." }
      ];
  }

  // 4. RESPONSE
  const data = {
    status: seasonName,
    hero: {
      subtitle: `AUTOMATED INTEL // ${today.toLocaleDateString()}`,
      title: `META <span style="color:var(--cod-red)">WATCH</span>`,
      desc: `Real-time surveillance of Season ${calculatedSeason}. Scanning Activision & Reddit data streams.`,
    },
    tierList: [
        { tier: "S+", name: "BP50", type: "AR", analysis: "High Fire Rate. Consistent Meta." },
        { tier: "S", name: "LAG 53", type: "AR", analysis: "New Season Favorite." },
        { tier: "S", name: "USS 9", type: "SMG", analysis: "Close Range King." },
        { tier: "A", name: "Tundra", type: "Sniper", analysis: "Aggressive Sniping." }
    ],
    codes: codes,
    patchNotes: patchNotes,
    video: videoIntel
  };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}

function getYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}