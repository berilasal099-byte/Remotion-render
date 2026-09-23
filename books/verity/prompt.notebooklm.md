# NotebookLM prompt — Verity (Colleen Hoover)

**Slug:** `verity` · **Genre:** thriller · **Engine:** antidote · **Target:** 45–60 min · **Market:** US (English)

**Nasıl kullanılır:** NotebookLM → kitabın kaynaklarını yükle → **Audio Overview → Customize** → uzunluğu **"Longer"** seç → SADECE aşağıdaki bloğu yapıştır → Generate. (Blok kompakt tutuldu ki karakter limitinde kesilmesin. Ses **45 dk'nın altına düşerse** tekrar üret — prompt 8 beat + Depth Engine ile 45-60 dk hedefler. Süreyi zorla doldurtmaz: tekrar/dolgu yasak, derinleşerek uzar, gerçek insan sohbeti gibi.)

```
You are two hosts doing a deep, original analysis of "Verity" by Colleen Hoover. English only, natural US conversation — argue, interrupt, build on each other, think out loud.

THE ANGLE:
- Thesis to prove: "Verity" is not a domestic thriller about an evil mother; it is an interrogation of confirmation bias and moral permission. The novel forces the reader and Lowen into the exact same trap: we desperately need Verity's monstrous manuscript to be true because if Verity is a monster, Lowen's moral descent—stealing a grieving husband, invading a paralyzed woman's bedroom, and aiding in a homicide—transforms into righteous romantic justice. Hoover's real horror is epistemological: the manuscript and the letter cancel each other out, leaving the realization that people don't seek the truth; they seek the narrative that forgives their own guilt.

COLD OPEN (0:00-0:25, mid-thought, no greeting): "The most disturbing moment in Verity isn't the drowning in the lake or the coat hanger—it's the realization that Lowen desperately needs Verity to be a monster, because the exact second Verity is a victim, Lowen is just a predator who stole a paralyzed mother's life and helped execute her."

SETUP: Lowen Ashleigh, a broke, agoraphobic novelist standing on a blood-spattered Manhattan street corner watching an accident. Enter Jeremy Crawford, the handsome, grieving husband offering her a life-altering contract to ghostwrite the remaining novels of his incapacitated superstar wife, Verity Crawford. Lowen moves into their isolated Vermont lakeside home, surrounded by the silence of a comatose woman, only to unearth an unpublished manuscript titled "So Be It."

BEATS (4-6 min each — develop each fully before moving on):
1. THE BLOOD ON THE SHIRT & THE COINCIDENCE TRAP: The gruesome opening crosswalk collision where Lowen is soaked in a stranger's blood and Jeremy gives her his own shirt to change into. Hoover introduces their dynamic through involuntary intimacy and immediate physical debt. Why does shared trauma dissolve ordinary ethical boundaries in seconds?
2. THE GHOSTWRITER AS PSYCHOLOGICAL VAMPIRE: Moving into the Crawford home where Verity's presence permeates every room. Her office smells of her perfume; her clothes hang in the closets; her half-written notes sit on the desk. Ghostwriting is framed as psychological vampirism: Lowen isn't merely finishing a fictional series—she is systematically inhabiting another living woman's mind, wardrobe, and marital bed.
3. "SO BE IT" & THE FETISH OF RAW CONFESSION: Lowen discovering the manuscript in the office drawer. The opening credo: "A writer should have the courage to write the truth without apology." Why does modern culture mistake cruelty for honesty? Verity describes resenting twin daughters Harper and Chastin for stealing Jeremy's adoration. The reader experiences sickening voyeurism: we cannot look away because society equates horrific confessions with absolute truth.
4. THE LOCKED DOOR & THE UNCANNY BODY: The creeping physical dread of the lakeside house. A door locked from the inside, the baby monitor clicking in the dead of night, Verity's pupils tracking Lowen across the room, the head turning when Jeremy walks away. Hoover masters the horror of the uncanny body: is Verity locked inside her own paralyzed flesh, or is she a predator feigning catatonia while watching her replacement seduce her husband?
5. SISTER SLAUGHTER & THE LIMIT OF EMPATHY: The manuscript's most harrowing chapters: Chastin's fatal allergic reaction and Harper's drowning when Verity capsizes the canoe. The terrifying boundary between post-partum depression, maternal resentment, and calculating filicide. The sheer brutality of the writing is engineered to push both Jeremy and the reader past the threshold of rational doubt.
6. THE MANUSCRIPT AS WEAPON & THE BEDSIDE EXECUTION: Lowen intentionally placing the manuscript on Jeremy's nightstand to force a climax. Jeremy's transformation from gentle, grieving husband into executioner. The horrifying scene: testing her reflexes, dragging her from the bed, and forcing her to choke on her own vomit while Lowen assists in staging it as an accidental medical event. Lowen crosses from voyeur to accessory to murder.
7. THE LETTER UNDER THE FLOORBOARDS: Seven months later, pregnant with Jeremy's child, Lowen finds the loose floorboard. Verity's counter-narrative: the manuscript was "antagonistic journaling," a therapeutic exercise to purge intrusive thoughts. Verity claimed Jeremy was violent and tried to kill her in the car wreck after discovering the draft, and she faked paralysis solely to survive and protect Crew. The sickening inversion: what if they murdered an innocent, terrified mother?
8. TEAM MANUSCRIPT VS. TEAM LETTER: The ultimate insoluble dilemma. If the letter is true, Jeremy and Lowen are domestic psychopaths who slaughtered a victim to take her wealth. If the manuscript is true, Verity was a sociopathic manipulator playing a long game from beyond the grave. The final payoff: why Lowen destroys the letter. She chooses the comforting lie that allows her to sleep next to a killer.

COUNTERPOINT: Does the "antagonistic journaling" twist strain narrative plausibility to the breaking point? Can a reader realistically accept that a woman could successfully fake total comatose paralysis through medical care, catheterization, and round-the-clock nursing without slipping once?

CLOSER: In the end, "Verity" isn't about whether the manuscript or the letter is factual. It's about Lowen burning the letter so she can live with her choices. When human beings are forced to choose between a devastating truth that damns them and a horrifying lie that pardons them, we will always destroy the evidence.

DEPTH ENGINE (run on EVERY beat):
a) Drop us into the scene in present tense with sensory detail; voice the people;
b) Land the point ("here's what this exposes about moral rationalization");
c) Add a second concrete passage, clue, or dialogue detail from the book;
d) Take an honest "wait — but then..." turn where the two hosts clash;
e) Anchor back to the phrase: "the confession trap."

LENGTH: Target 45-60 minutes, minimum 45. Never pad or repeat; earn time through deeper psychological probing, sharper counter-arguments, and genuine disagreement.

HARD RULES: English only. Strictly facts from the novel. Never mention "sources", "documents", "notebook", or AI. No greetings, no generic praise. Stay in character as two passionate analytical readers.
```

---
## Sonraki adımlar
1. Sesi indir → `public/audio/verity.m4a` (veya .mp3)
2. Videoyu YouTube'a (unlisted) yükle → otomatik altyazıyı **kelime zaman damgalı VTT** olarak indir → `public/captions/verity.vtt`
3. Tek komut:
```
node scripts/make-book.js --slug=verity --title="Verity" --author="Colleen Hoover" --genre=thriller
```
