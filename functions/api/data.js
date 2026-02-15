export async function onRequest(context) {
  // -------------------------------------------------------------------------
  // THE "AUTOMATIC" PART:
  // In a real scenario, you would fetch external data here.
  // Example: const youtubeData = await fetch('https://api.rss2json.com/...');
  // -------------------------------------------------------------------------

  // For now, we define the data here. 
  // You can update this file in GitHub, and it propagates globally in seconds.
  const data = {
    status: "SEASON 2 LIVE",
    hero: {
      subtitle: "YEAR OF THE HORSE UPDATE",
      title: 'Lunar <span style="color:var(--cod-red)">Charge</span>',
      desc: "The 2026 Meta has shifted. Master the USS 9, defeat Velikan, and claim your rewards."
    },
    tierList: [
      { 
        tier: "S+", 
        name: "USS 9", 
        type: "SMG", 
        analysis: "Undisputed King. Fastest TTK (180ms) up to 15m. Essential for Summit/Nuketown." 
      },
      { 
        tier: "S", 
        name: "Lachmann-556", 
        type: "AR", 
        analysis: "The new 'Zero Recoil' beamer. Replaces the Grau as the passive meta choice." 
      },
      { 
        tier: "S", 
        name: "SO-14", 
        type: "Marksman", 
        analysis: "Season 2's Dark Horse. Semi-auto fire rate buff makes it a 2-tap monster." 
      },
      { 
        tier: "A", 
        name: "Type 19", 
        type: "AR", 
        analysis: "Best beginner weapon. Vertical recoil only, easy to control." 
      }
    ],
    codes: [
      { code: "CUOFZBZR5M", reward: "Mabuhay Calling Card (Epic)" },
      { code: "CTULZBZBXP", reward: "Merc Combat Rig (Epic Operator)" },
      { code: "CUKQZBZTMS", reward: "R9-0 - Elevate Blueprint" }
    ]
  };

  // Return the data as JSON
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allow CORS
      "Cache-Control": "max-age=60" // Cache for 60 seconds
    }
  });
}