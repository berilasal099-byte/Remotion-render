# The Magician's Nephew — C.S. Lewis  ·  _fantasy_

> Bu kitabın **hub klasörü**. Kitaba dair her şey (config, meta, prompt, upload pack) burada; render çıktıları `public/` ve `out/` altında, aşağıda linkli.

## Dosyalar

| | Konum | Not |
|---|---|---|
| 🎬 Final video | `out/the-magician-s-nephew.mp4` _(yok)_ | render çıktısı |
| 🖼️ Thumbnail | [`out/thumbnail-the-magician-s-nephew.png`](../../out/thumbnail-the-magician-s-nephew.png) | YouTube kapak |
| 📝 YouTube pack | [`books/the-magician-s-nephew/youtube.md`](youtube.md) | başlık/açıklama/tag/bölümler |
| 💬 Captions (CC) | [`public/captions/the-magician-s-nephew.clean.vtt`](../../public/captions/the-magician-s-nephew.clean.vtt) | YouTube'a "With timing" yükle |
| 💬 Captions (ham) | [`public/captions/the-magician-s-nephew.vtt`](../../public/captions/the-magician-s-nephew.vtt) | kelime-zamanlı (karaoke kaynağı) |
| 🎙️ Audio | `public/audio/the-magician-s-nephew.m4a` _(yok)_ | NotebookLM sesi |
| 🖼️ Scene images | [`public/scenes/the-magician-s-nephew/`](../../public/scenes/the-magician-s-nephew) | Flux görselleri |
| ✍️ NotebookLM prompt | [`books/the-magician-s-nephew/prompt.notebooklm.md`](prompt.notebooklm.md) | orijinal analiz açısı |
| 📖 Manifest | [`books/the-magician-s-nephew/book.json`](book.json) | book.json (slug/başlık/engine) |
| ⚙️ Vox config | [`books/the-magician-s-nephew/config.vox.json`](config.vox.json) | render config (beats/captions) |
| ⚙️ YouTube meta | [`books/the-magician-s-nephew/youtube-meta.json`](youtube-meta.json) | SEO/meta + thumbnail brief |
| 🎞️ Render chunks | `out_Vox-the-magician-s-nephew_chunks/` _(yok)_ | ara mp4 parçaları + parts.txt |

## Yükleme sırası
1. `out/the-magician-s-nephew.mp4` yükle
2. Başlık + açıklama (bölümler tıklanabilir olur) + tag → [youtube.md](youtube.md)
3. Thumbnail → `out/thumbnail-the-magician-s-nephew.png`
4. CC → `the-magician-s-nephew.clean.vtt` ("With timing")
5. **Altered content = Yes** (sentetik ses)

## Yeniden üretmek
```bash
node scripts/make-book.js --slug=the-magician-s-nephew --title="The Magician's Nephew" --author="C.S. Lewis" --genre=fantasy
```
