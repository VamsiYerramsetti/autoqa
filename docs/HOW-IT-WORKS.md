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
text out of every slide (and, for PDFs, takes a picture of each slide). The model reads it all once and writes three
or four short questions about things the audience will likely ask that the slides don't say. The speaker's answers
are kept as extra notes.

**Someone in the audience asks.** Their phone sends the question to the website. The website gives the model: the
rules (answer briefly, in plain words, only from this material, say which slide), the slide text, the speaker's notes,
and any replies the speaker already gave. The answer streams back word by word, and the phone shows the slide it names.

**The slides don't cover it.** The model says so instead of guessing. The person sees a yellow card asking whether to
send the question to the speaker. Only then do we ask for their name and email, and we say exactly who receives them.
Questions that mean the same thing are grouped into one card for the speaker.

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
No tracking cookies and no outside trackers. The only cookie keeps a speaker signed in. Visitor counts use a
daily-changing scrambled code, never names or emails. Audience members stay anonymous unless they choose to send a
question to the speaker. Speakers can close their account and everything in it is deleted.
