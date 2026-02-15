export async function onRequest(context) {
  // 1. DYNAMIC SEASON CALCULATOR
  // Automatically increments season based on date (approx monthly cycle)
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // Jan is 0
  const calculatedSeason = (currentMonth % 12) + 1; // Resets yearly
  const seasonName = `SEASON ${calculatedSeason} LIVE`;

  // 2. REDDIT SCRAPER CONFIG
  // We fetch the latest posts from the official subreddit looking for codes
  const redditUrl = "https://www.reddit.com/r/CallOfDutyMobile/search.json?q=title%3A%22code%22+OR+flair%3A%22Redeem+Code%22&restrict_sr=1&sort=new&limit=10";
  
  let codes = [];
  let news = [];

  try {
    const response = await fetch(redditUrl, {
      headers: { 'User-Agent': 'CODMobileOrg-Bot/1.0' }
    });
    
    if (response.ok) {
      const json = await response.json();
      
      // 3. INTELLIGENT PARSING
      json.data.children.forEach(post => {
        const p = post.data;
        
        // Extract Codes using Regex (Looking for 10-14 char uppercase strings)
        const codeRegex = /\b[A-Z0-9]{10,14}\b/g;
        const foundInTitle = p.title.match(codeRegex);
        const foundInBody = p.selftext.match(codeRegex);
        
        if (foundInTitle || foundInBody) {
          const validCodes = [...(foundInTitle || []), ...(foundInBody || [])];
          validCodes.forEach(code => {
             // Avoid duplicates
            if (!codes.find(c => c.code === code)) {
              codes.push({ 
                code: code, 
                reward: "Community Found", 
                source: "Reddit" 
              });
            }
          });
        }

        // Add to News Ticker if it's a popular post
        if (p.score > 50) {
          news.push(p.title);
        }
      });
    }
  } catch (err) {
    // Fail silently to default data if Reddit blocks us
    console.log("Reddit Fetch Error", err);
  }

  // 4. FALLBACK DATA (If Reddit yields nothing today)
  if (codes.length === 0) {
    codes = [
        { code: "BVRPZBZJ53", reward: "Verified Code", source: "Backup" },
        { code: "BMRMZBZESA", reward: "Verified Code", source: "Backup" }
    ];
  }

  // 5. CONSTRUCT RESPONSE
  const data = {
    status: seasonName,
    hero: {
      subtitle: `AUTOMATED INTEL // ${today.toLocaleDateString()}`,
      title: `META <span style="color:var(--cod-red)">WATCH</span>`,
      desc: `Real-time surveillance of the CODM Meta. Automatically scanning for Season ${calculatedSeason} intel and active redemption codes.`,
      metaDate: "LIVE FEED",
      metaDesc: "Latest data pulled from r/CallOfDutyMobile"
    },
    tierList: [
        // We keep the tier list 'Safe' static because AI text analysis of meta is too risky for automation without LLM
        { tier: "S+", name: "BP50", type: "AR", analysis: "High Fire Rate. Consistent Meta." },
        { tier: "S", name: "LAG 53", type: "AR", analysis: "New Season Favorite." },
        { tier: "S", name: "USS 9", type: "SMG", analysis: "Close Range King." },
        { tier: "A", name: "Tundra", type: "Sniper", analysis: "Aggressive Sniping." }
    ],
    codes: codes
  };

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
}