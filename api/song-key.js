export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: "title 필요" });

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  try {
    // 1. Spotify 토큰 발급
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

    // 2. Spotify에서 트랙 검색 → ID 획득
    const q = encodeURIComponent(title + " " + (artist || ""));
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1&market=KR`,
      { headers: { Authorization: "Bearer " + tokenData.access_token } }
    );
    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];
    if (!track) return res.status(200).json({ success: false, message: "Spotify에서 곡 없음" });

    // 3. ReccoBeats API로 키 정보 가져오기
    const featRes = await fetch(`https://api.reccobeats.com/v1/track/${track.id}/audio-features`);
    const feat = await featRes.json();

    const KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const keyName = (feat.key >= 0 && feat.key <= 11) ? KEYS[feat.key] : "알 수 없음";
    const mode = feat.mode === 1 ? "장조" : "단조";

    return res.status(200).json({
      success: true,
      title: track.name,
      artist: track.artists?.[0]?.name,
      key: feat.key,
      keyName: keyName,
      mode: mode,
      keyFull: keyName + " " + mode,
      tempo: Math.round(feat.tempo),
      energy: Math.round(feat.energy * 100),
      danceability: Math.round(feat.danceability * 100),
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
