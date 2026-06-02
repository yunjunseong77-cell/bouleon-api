export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { q, type = "0" } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: "검색어를 입력해주세요." });

  try {
    const url = `https://www.tjmedia.com/song/accompaniment_search?nationType=&strType=${type}&searchTxt=${encodeURIComponent(q)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.tjmedia.com/",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
    });

    const html = await response.text();

    if (html.includes("점검중") || html.includes("service_check")) {
      return res.status(200).json({ success:true, query:q, count:0, songs:[], message:"TJ 점검 중" });
    }

    const songs = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let rowIndex = 0;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      if (rowIndex++ === 0) continue;
      const rowHtml = rowMatch[1];
      const cells = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        cells.push(
          cellMatch[1]
            .replace(/<[^>]+>/g, "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#[0-9]+;/g, "")
            .trim()
        );
      }
      if (cells.length >= 3 && cells[0] && cells[1] && /^\d+$/.test(cells[0].replace(/\s/g,""))) {
        songs.push({
          tj: cells[0].replace(/\s/g,""),
          title: cells[1],
          artist: cells[2],
          lyricist: cells[3] || "",
          composer: cells[4] || "",
        });
      }
      if (songs.length >= 50) break;
    }

    return res.status(200).json({ success:true, query:q, count:songs.length, songs });
  } catch (e) {
    return res.status(500).json({ success:false, error:e.message });
  }
}
