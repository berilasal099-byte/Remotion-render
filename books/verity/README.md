# Verity — Colleen Hoover  ·  _thriller_

> Bu kitabın **hub klasörü**. Kitaba dair her şey (config, meta, prompt, upload pack) burada; render çıktıları `public/` ve `out/` altında, aşağıda linkli.

## Dosyalar

| | Konum | Not |
|---|---|---|
| 🎬 Final video | `out/verity.mp4` _(yok)_ | render çıktısı |
| 🖼️ Thumbnail | [`out/thumbnail-verity.png`](../../out/thumbnail-verity.png) | YouTube kapak |
| 📝 YouTube pack | [`books/verity/youtube.md`](youtube.md) | başlık/açıklama/tag/bölümler |
| 💬 Captions (CC) | [`public/captions/verity.clean.vtt`](../../public/captions/verity.clean.vtt) | YouTube'a "With timing" yükle |
| 💬 Captions (ham) | [`public/captions/verity.vtt`](../../public/captions/verity.vtt) | kelime-zamanlı (karaoke kaynağı) |
| 🎙️ Audio | [`public/audio/verity.m4a`](../../public/audio/verity.m4a) | NotebookLM sesi |
| 🖼️ Scene images | [`public/scenes/verity/`](../../public/scenes/verity) | Flux görselleri |
| ✍️ NotebookLM prompt | [`books/verity/prompt.notebooklm.md`](prompt.notebooklm.md) | orijinal analiz açısı |
| 📖 Manifest | [`books/verity/book.json`](book.json) | book.json (slug/başlık/engine) |
| ⚙️ Vox config | `books/verity/config.vox.json` _(yok)_ | render config (beats/captions) |
| ⚙️ YouTube meta | [`books/verity/youtube-meta.json`](youtube-meta.json) | SEO/meta + thumbnail brief |
| 🎞️ Render chunks | `out_Vox-verity_chunks/` _(yok)_ | ara mp4 parçaları + parts.txt |

## Yükleme sırası
1. `out/verity.mp4` yükle
2. Başlık + açıklama (bölümler tıklanabilir olur) + tag → [youtube.md](youtube.md)
3. Thumbnail → `out/thumbnail-verity.png`
4. CC → `verity.clean.vtt` ("With timing")
5. **Altered content = Yes** (sentetik ses)

## Yeniden üretmek
```bash
node scripts/make-book.js --slug=verity --title="Verity" --author="Colleen Hoover" --genre=thriller
```
