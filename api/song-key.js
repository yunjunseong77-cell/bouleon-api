export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId) return res.status(200).json({ error: "SPOTIFY_CLIENT_ID 없음" });
  if (!clientSecret) return res.status(200).json({ error: "SPOTIFY_CLIENT_SECRET 없음" });
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
    if (!title) return res.status(200).json({ success: true, token: "발급 성공!", message: "title 파라미터 없음" });
    const q = encodeURIComponent(title + " " + (artist || ""));
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1&market=KR`, {
      headers: { Authorization: "Bearer " + tokenData.access_token }
    });
    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];
    if (!track) return res.status(200).json({ success: false, message: "곡 없음" });
    const featRes = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
      headers: { Authorization: "Bearer " + tokenData.access_token }
    });
    const feat = await featRes.json();
    const KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    return res.status(200).json({
      success: true,
      title: track.name,
      artist: track.artists?.[0]?.name,
      keyName: feat.key >= 0 ? KEYS[feat.key] : "?",
      mode: feat.mode === 1 ? "장조" : "단조",
      tempo: Math.round(feat.tempo),
      energy: Math.round(feat.energy * 100),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
