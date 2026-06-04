export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(200).json({ error: "환경변수 없음" });
  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(200).json({ error: "토큰 실패", detail: tokenData });

    const { title, artist } = req.query;
    if (!title) return res.status(200).json({ success: true, message: "토큰 발급 성공!" });

    const q = encodeURIComponent(title + " " + (artist || ""));
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1&market=KR`,
      { headers: { Authorization: "Bearer " + tokenData.access_token } }
    );
    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];
    if (!track) return res.status(200).json({ success: false, message: "곡 없음" });

    return res.status(200).json({
      success: true,
      title: track.name,
      artist: track.artists?.[0]?.name,
      spotifyId: track.id,
      popularity: track.popularity,
      previewUrl: track.preview_url,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
