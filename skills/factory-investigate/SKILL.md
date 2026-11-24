---
name: factory-investigate
description: "Answer a question about code without changing it: trace the behaviour, separate evidence from inference, and end with an explanation or a recommendation. Use when the user asks why something works a certain way, how a subsystem fits together, or which of several approaches to take."
---

# Investigate

This is a read-only route. No edits, no commit, no pull request. If the work turns out to need a
change, finish the explanation, then propose the change as a separate task and let the operator
choose.

The failure this route prevents: a question about why something behaves a certain way quietly
becomes a patch, and the user gets a diff where they wanted an answer.

## 1. Turn the request into one question

Write the question down in one sentence, in the form the answer will take.

- "Why does the cache miss on every second request?"
- "How does a task document reach a worker and come back?"
- "Should the retry live in the client or the queue consumer?"

One question. If the request contains three, answer the one the user led with and name the others
as separate questions.

## 2. Find the boundary of the answer

Before reading code, write the shortest path from the thing the user named to the thing they
observed. Then read along that path.

Read in this order, and stop when the chain closes:

1. The entry point that names the feature: a route, a CLI command, an event handler, a test.
2. The function that makes the decision.
3. The state it reads: a table, a config value, a cache, a field set earlier.
4. The tests that pin the current behaviour. Tests describe intent better than comments do.

Grep for the callers of anything whose behaviour surprises you. A function that looks wrong is
often correct for a caller you have not read yet.

## 3. Separate what you saw from what you think

Every claim in your answer gets one of three labels, in your own words rather than as a tag.

- **Read it.** The code says this. Quote the file and the line.
- **Ran it.** The behaviour is this. Show the command and the output.
- **Inferred.** This is my reading of how it fits together. It is not proven.

Do not let an inference stand as a fact. The most common failure in this route is a confident
explanation assembled from half a trace.

## 4. Answer the question, then the question behind it

The answer, in the order that helps most.

1. The direct answer, in a sentence or two.
2. The mechanism, in the fewest steps that make it click. A short diagram when the path has more
   than three hops.
3. Why it is built this way, when you can tell. Cite a comment, a commit message, a test, or say
   that the record does not answer it.
4. What would change the answer: a config, a flag, a dependency version, a caller you did not
   read.

If the user is about to make a decision, name the options with their tradeoffs and give a
recommendation. A recommendation with a reason is useful. A survey of options with no
recommendation is a reading list.

## 5. Where to stop

Stop when the question is answered. Do not audit the surrounding code, list every smell you
passed, or propose a refactor unless it changes the answer. Name what you did not read, in one
line, so the user knows the edges.

## Before you reply

Check three things.

- No file was modified. `git status` confirms it.
- Every factual claim has a location or a command behind it.
- The answer starts with the answer, not with what you read.

This route still ends at `../factory-bar/SKILL.md`, with two boxes standing in place of the
usual ones. Box 1 is the question answered. Box 6 is nothing modified and nothing overstated. Box
2 and 3 do not apply unless you ran something to establish behaviour, in which case they apply
fully.

## Reply

The question, the answer in one or two sentences, the mechanism, the evidence with locations, what
you inferred, and what you did not read.
