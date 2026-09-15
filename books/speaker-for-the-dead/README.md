# Speaker for the Dead — Orson Scott Card  ·  _science-fiction_

> Bu kitabın **hub klasörü**. Kitaba dair her şey (config, meta, prompt, upload pack) burada; render çıktıları `public/` ve `out/` altında, aşağıda linkli.

## Dosyalar

| | Konum | Not |
|---|---|---|
| 🎬 Final video | `out/speaker-for-the-dead.mp4` _(yok)_ | render çıktısı |
| 🖼️ Thumbnail | [`out/thumbnail-speaker-for-the-dead.png`](../../out/thumbnail-speaker-for-the-dead.png) | YouTube kapak |
| 📝 YouTube pack | [`books/speaker-for-the-dead/youtube.md`](youtube.md) | başlık/açıklama/tag/bölümler |
| 💬 Captions (CC) | [`public/captions/speaker-for-the-dead.clean.vtt`](../../public/captions/speaker-for-the-dead.clean.vtt) | YouTube'a "With timing" yükle |
| 💬 Captions (ham) | [`public/captions/speaker-for-the-dead.vtt`](../../public/captions/speaker-for-the-dead.vtt) | kelime-zamanlı (karaoke kaynağı) |
| 🎙️ Audio | [`public/audio/speaker-for-the-dead.m4a`](../../public/audio/speaker-for-the-dead.m4a) | NotebookLM sesi |
| 🖼️ Scene images | [`public/scenes/speaker-for-the-dead/`](../../public/scenes/speaker-for-the-dead) | Flux görselleri |
| ✍️ NotebookLM prompt | [`books/speaker-for-the-dead/prompt.notebooklm.md`](prompt.notebooklm.md) | orijinal analiz açısı |
| 📖 Manifest | [`books/speaker-for-the-dead/book.json`](book.json) | book.json (slug/başlık/engine) |
| ⚙️ Vox config | `books/speaker-for-the-dead/config.vox.json` _(yok)_ | render config (beats/captions) |
| ⚙️ YouTube meta | [`books/speaker-for-the-dead/youtube-meta.json`](youtube-meta.json) | SEO/meta + thumbnail brief |
| 🎞️ Render chunks | `out_Vox-speaker-for-the-dead_chunks/` _(yok)_ | ara mp4 parçaları + parts.txt |

## Yükleme sırası
1. `out/speaker-for-the-dead.mp4` yükle
2. Başlık + açıklama (bölümler tıklanabilir olur) + tag → [youtube.md](youtube.md)
3. Thumbnail → `out/thumbnail-speaker-for-the-dead.png`
4. CC → `speaker-for-the-dead.clean.vtt` ("With timing")
5. **Altered content = Yes** (sentetik ses)

## Yeniden üretmek
```bash
node scripts/make-book.js --slug=speaker-for-the-dead --title="Speaker for the Dead" --author="Orson Scott Card" --genre=science-fiction
```
