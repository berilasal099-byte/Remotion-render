# Storyboard authoring — The Magician's Nephew (C.S. Lewis) · Vox engine

Vox = photoreal Flux stills + kinetic type. For EVERY beat decide what a viewer with the SOUND OFF
must see. Each image costs money and a wrong one is worse than none. ENGLISH only.
Book context: `books/the-magician-s-nephew/story-bible.json` — world/era: 1900.

## Output — one object per beat in your chunk, same order, same `i`
```json
{ "i": 12,
  "design": {
    "type": "statement|imagefocus|list|quote|stat|compare|checklist|polaroid|chart|timeline|question|punchline|place|document|map|flow",
    "kicker": "2-4 word ALL-CAPS tag or ''",
    "emphasis": ["1-3 SHORT ALL-CAPS specific words from THIS beat: names, places, numbers"],
    "items": [],                                     // list/checklist only: 2-4 SHORT ALL-CAPS items
    "image": null | { "subject": "a described photograph", "style": "cutout|card" },
    "compare": null | { "left": {"label","subject"}, "right": {"label","subject"} },
    "storyboard": { "claim": "...", "concreteVisual": "...", "onScreenText": "...",
                    "relationToPrevious": "...", "addedInformation": "..." } } }
```

## The image test (most important)
`image.subject` is a DESCRIBED PHOTOGRAPH — who, doing what, where, when — never a keyword list
("heart, manuscript, 1985" is forbidden). A muted viewer must guess the sentence from it. Reuse a
character's look VERBATIM so the same person recurs:
- Digory Kirke: a slim English boy of about eleven, short untidy brown hair, grey wool jacket and short trousers, scuffed boots, Edwardian 1900 London schoolboy
- Polly Plummer: a girl of about eleven, dark plaited hair, a long-sleeved cotton dress with a pinafore, buttoned boots, Edwardian 1900 London girl
- Uncle Andrew: an old man, wild grey hair, a sharply pointed nose, a dressing gown over a waistcoat, pale vain face, Victorian scholar-magician
- Aunt Letty: a stout middle-aged Edwardian woman, hair pinned up, high-necked grey dress with a lace collar, stern face
- Jadis, the Witch: a tall, beautiful woman with black hair and a cold white face, a long dark gown with a silver crown, regal and terrifying
- Frank the cabby: a weathered working-class London cabman, flat cap, heavy wool coat, thick moustache, Edwardian street worker
- Aslan: a huge golden-tawny lion with a shining mane, calm and majestic, standing in light
- Fledge: a strong chestnut horse with large feathered wings folded at its shoulders, Narnian and magical
- Mrs Kirke: a pale thin Edwardian woman in a white nightgown and shawl, lying in a bed, frail and weary
Keep the era right (no anachronisms). Flux drops gore, children in danger and war violence
(CONTENT_FILTERED) — soften to aftermath, symbol or place. No text inside images.
## Coverage — a muted viewer needs a picture most of the time
Give 70-85% of beats an image. The mute-test bar (image ADDS on >= 60% of ALL frames) cannot
be met otherwise: All the Light had images on 44% of its screen time and failed on text-only frames
while its images scored 14/15. An idea with no photograph still has a place, a person or an object
that carries it (the reader at a desk, the ruined street, the radio). `statement` with image null
only for pure banter or when every picture would mislead.
ONLY `imagefocus`, `polaroid`, `compare` and `duo` put a picture on screen. An image on any other
type (list, question, place, quote, stat, punchline, timeline…) is never shown — the planner turns such
a beat into imagefocus. Keep 15-30% of beats as those text archetypes WITHOUT an image where the shape
is the point (a real question, a real list, a real quotation): 40 minutes of one layout loses viewers.

## Output
Return ONLY a JSON array for your chunk. Validate it parses and matches every `i`.
