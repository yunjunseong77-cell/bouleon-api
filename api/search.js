export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q, type = "1" } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: "검색어를 입력해주세요." });

  try {
    const strCond = type === "2" ? "2" : type === "3" ? "0" : "1";
    const url = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=16&strCond=${strCond}&strText=${encodeURIComponent(q)}&strSize05=100`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.tjmedia.com/",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    const html = await response.text();
    const songs = [];

    const tableMatch = html.match(/<table[^>]*class="[^"]*board_type1[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (tableMatch) {
      const rows = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      let i = 0;
      for (const row of rows) {
        if (i++ === 0) continue;
        const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
          .map(c => c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim());
        if (cells.length >= 3 && cells[0] && cells[1] && cells[1] !== "곡제목") {
          songs.push({ tj: cells[0].replace(/\D/g, ""), title: cells[1], artist: cells[2], lyricist: cells[3] || "" });
        }
        if (songs.length >= 50) break;
      }
    }

    return res.status(200).json({ success: true, query: q, count: songs.length, songs });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
