export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q, type = "1" } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: "검색어를 입력해주세요." });

  try {
    const strCond = type === "2" ? "2" : type === "3" ? "0" : "1";
    const url = `https://www.tjmedia.com/tjsong/song_search_list.asp?strType=16&strCond=${strCond}&strText=${encodeURIComponent(q)}&strSize05=100`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.tjmedia.com/",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
    });

    const html = await response.text();

    // 점검 중 체크
    if (html.includes("점검중") || html.includes("service_check")) {
      return res.status(200).json({
        success: true, query: q, count: 0, songs: [],
        message: "TJ미디어 서버 점검 중입니다. 잠시 후 다시 시도해주세요."
      });
    }

    const songs = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let rowMatch;
    let rowIndex = 0;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      if (rowIndex++ === 0) continue;
      const rowHtml = rowMatch[1];
      const cells = [];
      let cellMatch;
      const cellRegexCopy = new RegExp(cellRegex.source, "gi");
      while ((cellMatch = cellRegexCopy.exec(rowHtml)) !== null) {
        cells.push(
          cellMatch[1]
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#[0-9]+;/g, "")
            .trim()
        );
      }
      if (cells.length >= 3 && cells[0] && cells[1] && cells[1] !== "곡제목" && /^\d+$/.test(cells[0])) {
        songs.push({
          tj: cells[0],
          title: cells[1],
          artist: cells[2],
          lyricist: cells[3] || "",
          composer: cells[4] || "",
        });
      }
      if (songs.length >= 50) break;
    }

    return res.status(200).json({ success: true, query: q, count: songs.length, songs });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
