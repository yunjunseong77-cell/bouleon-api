export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: "검색어를 입력해주세요." });

  try {
    const url = `https://kysing.kr/search/?s=${encodeURIComponent(q)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://kysing.kr/",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    const html = await response.text();
    const songs = [];

    const rows = html.matchAll(/<tr[^>]*class="[^"]*search_tr[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(c => c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
      if (cells.length >= 2 && cells[0]) {
        songs.push({ ky: cells[0].replace(/\D/g, ""), title: cells[1], artist: cells[2] || "" });
      }
      if (songs.length >= 50) break;
    }

    return res.status(200).json({ success: true, query: q, count: songs.length, songs });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
