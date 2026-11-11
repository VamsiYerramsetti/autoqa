# How Auto Q&A works (no code)

## The pieces
- **The website** is one small program (`server.js`). It shows the pages and keeps track of talks, questions and accounts.
- **The model** is Claude, a language model made by Anthropic. The website sends it a question plus the speaker's
  slides and gets an answer back. We use the cheapest model, Claude Haiku, because answers need to be fast and the
  task is narrow.
- **The database** (Neon) remembers accounts, talks, questions and slide pictures, so nothing is lost when the site restarts.
- **The hosting** (Render) runs the website on the internet.
- **GitHub** stores the code and its history, and runs the automatic tests.

## What happens when...

**A speaker sets up a talk.** They sign up, give the talk a title and drop in their slides. The website pulls the
text out of every slide (and, for PDFs, takes a picture of each slide). Then it has a short conversation with the
speaker: one question at a time, each one built on the last answer, about what the slides can't say (where a number
comes from, the method, the limits, what's next). Early on it asks for anything else useful: a transcript, a script,
notes, a paper. The speaker can type, speak (the browser turns speech into text) or attach a file, and can stop at any
point. Everything they say is kept as extra notes the answers can draw on.

**Someone in the audience asks.** Their phone sends the question to the website. The website gives the model: the
rules (answer briefly, in plain words, only from this material, say which slide), the slide text, the speaker's notes,
and any replies the speaker already gave. The answer streams back word by word, and the phone shows the slide it names.

**It's a general question.** If someone asks what a term means or how something works in general, the answer can
come from general knowledge, and it says so ("This isn't in the slides, but in general..."). A small "Ask the
speaker too" button lets the person get the speaker's own take as well.

**The slides don't cover a fact about the talk.** The model says so instead of guessing. The person sees a yellow card asking whether to
send the question to the speaker. Only then do we ask for their name and email, and we say exactly who receives them. They can also switch on "Ask
anonymously": the speaker then sees the question but not who asked, and the reply still appears in the person's chat.
Questions that mean the same thing are grouped into one card for the speaker.

**"Me too".** Questions waiting for the speaker show at the top of everyone's chat ("2 waiting for Maya"), without
the askers' names. Anyone can tap "Me too" on one, with no name or email: the speaker's card then says "+3 want this
too", the most-wanted question moves to the top of the speaker's list, and the reply shows up in that person's chat
as well. Someone whose own question was already sent by others is told so ("2 people here already asked this").
Questions sent before this existed stay private, because those askers weren't told the room would see them.

**Something goes wrong mid-answer.** The model thinks before it writes, and if it ever runs out of room the person
sees only the whole sentences it managed, plus the offer to send the question to the speaker. We never show half a
sentence, and we never say "the talk doesn't cover that" just because the model said nothing.

**How answers name the speaker.** By first name ("Maya says"), or by title and surname when the speaker signed up
with a title ("Dr. Carvalho says").

**Questions in another language.** Answers come back in the language the person wrote in. If that question is sent to
the speaker, the card in the speaker's inbox shows it twice: as asked, and in the language of the slides.

**The speaker replies.** The reply appears in each asker's chat. It's also added to what the model knows, so the
next person who asks gets the speaker's own answer straight away.

## There is no "training"
The model isn't trained on anyone's slides. Each time, it's handed the material along with the question, and it
forgets it afterwards. That's why answers can change the moment the speaker replies, and why one talk's slides never
leak into another's.

## How it's kept honest
- An automatic test walks through the whole product after every change, first on a test copy and then on the live site.
- Every morning a test session invents a new talk and a mixed audience (a beginner, an expert, a sceptic, someone
  writing in another language...), plays them through the real site, scores every answer, fixes the weakest spot
  and checks the fix helped. Reports are in `docs/persona-runs/`.

## Privacy, briefly
Light and dark mode follow the phone's setting; a moon/sun button switches them, remembered on that device only.
No tracking cookies and no outside trackers. The only cookie keeps a speaker signed in. Visitor counts use a
daily-changing scrambled code, never names or emails. Audience members stay anonymous unless they choose to send a
question to the speaker. Speakers can close their account and everything in it is deleted.
