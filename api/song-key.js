export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: "곡명을 입력해주세요." });

  try {
    // Spotify 토큰 발급
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    // 곡 검색
    const query = encodeURIComponent((title + " " + (artist || "")).trim());
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1&market=KR`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const searchData = await searchRes.json();
    const track = searchData.tracks?.items?.[0];
    if (!track) return res.status(200).json({ success: false, message: "곡을 찾을 수 없어요." });

    // 음악 분석 데이터 가져오기
    const featRes = await fetch(
      `https://api.spotify.com/v1/audio-features/${track.id}`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const feat = await featRes.json();

    // 키 변환 (0=C, 1=C#, 2=D, 3=D#, 4=E, 5=F, 6=F#, 7=G, 8=G#, 9=A, 10=A#, 11=B)
    const KEY_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    const keyName = feat.key >= 0 ? KEY_NAMES[feat.key] : "알 수 없음";
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
      valence: Math.round(feat.valence * 100),
      danceability: Math.round(feat.danceability * 100),
    });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
