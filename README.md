# DCSA — Algorithmic Complexity Visualizer

A small teaching web app for explaining algorithmic time complexity
(O(1), O(log n), O(n), O(n log n), O(n²), ...) using real C++ code.

## How to use

Open `index.html` in any browser — no build step or server required.

1. Paste C++ code into the text field (or pick one of the built-in examples
   from the dropdown: constant, binary search, bubble sort, matrix
   multiplication, recursion, ...).
2. Press **Highlight complexity steps** (or Ctrl/Cmd+Enter).
3. The app shows the code with the complexity-relevant steps highlighted:
   - **loops** colored by nesting depth (yellow → orange → red),
   - **logarithmic loops** (halving/doubling counters like `i *= 2`,
     `high = mid - 1`) in cyan,
   - **recursive calls** in violet,

   plus an estimated overall complexity and a numbered list of the steps to
   consider, each explaining how it contributes (click a line number to jump
   to it in the code).

## How it works

`js/analyzer.js` is a heuristic, line-based analyzer (not a full C++ parser):

- comments and string literals are stripped so keywords inside them are ignored;
- `for` / `while` / `do` loops are detected and their nesting depth is tracked
  via braces (single-statement bodies without braces are handled too);
- a loop is classified as **logarithmic** when its update step multiplies or
  divides the counter (`*=`, `/=`, `<<=`, `>>=`, `mid = (low + high) / 2`, ...);
- function definitions are collected and calls to the enclosing function are
  flagged as **recursion**;
- the overall estimate is the deepest chain of nested loops, e.g. two nested
  linear loops → O(n²), a linear loop containing a halving loop → O(n log n).
  Recursion is flagged with a note about the recurrence relation rather than
  estimated automatically.

It is intentionally simple and meant for teaching — always sanity-check the
loop bounds and recurrences by hand with the students.

## Project layout

```
index.html       — page structure
css/style.css    — styling, highlight colors, legend
js/analyzer.js   — the heuristic complexity analyzer (pure logic, no DOM)
js/examples.js   — built-in teaching examples
js/app.js        — UI wiring and rendering
```
