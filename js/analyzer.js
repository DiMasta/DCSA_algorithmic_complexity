/*
 * Heuristic C++ complexity analyzer.
 *
 * Scans C++ source line by line, tracks brace nesting, and marks the
 * constructs that matter when evaluating algorithmic complexity:
 *   - linear loops        (for/while/do-while)   -> multiply work by n
 *   - logarithmic loops   (i *= 2, i /= 2, ...)  -> multiply work by log n
 *   - recursive calls                            -> recurrence relation
 *
 * The result is a per-line annotation list plus an overall estimate such
 * as O(1), O(log n), O(n), O(n log n), O(n^2), ...
 *
 * This is intentionally a teaching heuristic, not a full C++ parser.
 */
(function (global) {
  'use strict';

  // --- helpers -----------------------------------------------------------

  // Replace comments and string/char literals with spaces so that keywords
  // inside them are ignored. Keeps line structure intact.
  function stripCommentsAndStrings(code) {
    var out = '';
    var i = 0;
    var n = code.length;
    var mode = 'code'; // code | line-comment | block-comment | string | char
    while (i < n) {
      var c = code[i];
      var next = i + 1 < n ? code[i + 1] : '';
      if (mode === 'code') {
        if (c === '/' && next === '/') { mode = 'line-comment'; out += '  '; i += 2; continue; }
        if (c === '/' && next === '*') { mode = 'block-comment'; out += '  '; i += 2; continue; }
        if (c === '"') { mode = 'string'; out += ' '; i++; continue; }
        if (c === "'") { mode = 'char'; out += ' '; i++; continue; }
        out += c; i++; continue;
      }
      if (mode === 'line-comment') {
        if (c === '\n') { mode = 'code'; out += '\n'; } else { out += ' '; }
        i++; continue;
      }
      if (mode === 'block-comment') {
        if (c === '*' && next === '/') { mode = 'code'; out += '  '; i += 2; continue; }
        out += (c === '\n') ? '\n' : ' ';
        i++; continue;
      }
      // string or char literal
      if (c === '\\') { out += '  '; i += 2; continue; }
      if ((mode === 'string' && c === '"') || (mode === 'char' && c === "'")) { mode = 'code'; out += ' '; i++; continue; }
      out += (c === '\n') ? '\n' : ' ';
      i++; continue;
    }
    return out;
  }

  var LOG_STEP_RE = /(\w+)\s*(?:\*=|\/=|<<=|>>=)\s*[^,;)]+|(\w+)\s*=\s*\2\s*(?:\*|\/|<<|>>)\s*[^,;)]+|(\w+)\s*=\s*\(?\s*\w+\s*[+\-]\s*\w+\s*\)?\s*\/\s*2/;

  function isLogarithmicFor(header) {
    // header is the text inside for(...)
    var parts = header.split(';');
    var update = parts.length >= 3 ? parts[2] : header;
    return LOG_STEP_RE.test(update);
  }

  function isLogarithmicBody(bodyLines) {
    for (var i = 0; i < bodyLines.length; i++) {
      if (LOG_STEP_RE.test(bodyLines[i])) return true;
    }
    return false;
  }

  // --- complexity arithmetic ---------------------------------------------

  // A cost is { nPow, logPow } meaning n^nPow * (log n)^logPow.
  function costLabel(cost) {
    if (cost.nPow === 0 && cost.logPow === 0) return 'O(1)';
    var parts = [];
    if (cost.nPow === 1) parts.push('n');
    else if (cost.nPow > 1) parts.push('n^' + cost.nPow);
    if (cost.logPow === 1) parts.push('log n');
    else if (cost.logPow > 1) parts.push('log^' + cost.logPow + ' n');
    return 'O(' + parts.join(' ') + ')';
  }

  function costGreater(a, b) {
    if (a.nPow !== b.nPow) return a.nPow > b.nPow;
    return a.logPow > b.logPow;
  }

  // --- main analysis ------------------------------------------------------

  var FUNC_DEF_RE = /^\s*(?:template\s*<[^>]*>\s*)?(?:[\w:<>,~&*\s]+?[\s&*])(\w+)\s*\([^;{]*\)\s*(?:const\s*)?(?:noexcept\s*)?(?:->\s*[\w:<>,&*\s]+)?\s*\{/;
  var CONTROL_KEYWORDS = { 'if': 1, 'for': 1, 'while': 1, 'switch': 1, 'return': 1, 'else': 1, 'do': 1, 'catch': 1 };

  /**
   * Analyze C++ code.
   * @param {string} code raw source
   * @returns {{
   *   lines: Array<{number:number, text:string, annotations:Array, loopDepth:number}>,
   *   findings: Array<{line:number, type:string, message:string}>,
   *   overall: string,
   *   hasRecursion: boolean
   * }}
   */
  function analyze(code) {
    var rawLines = code.replace(/\r\n/g, '\n').split('\n');
    var cleanLines = stripCommentsAndStrings(code.replace(/\r\n/g, '\n')).split('\n');

    var lines = rawLines.map(function (text, idx) {
      return { number: idx + 1, text: text, annotations: [], loopDepth: 0 };
    });
    var findings = [];

    // ---- pass 1: find function definitions (for recursion detection) ----
    // Track brace depth so we know each function's body extent.
    var functions = []; // {name, startLine, endLine}
    var braceDepth = 0;
    var funcStack = [];
    for (var li = 0; li < cleanLines.length; li++) {
      var line = cleanLines[li];
      var m = FUNC_DEF_RE.exec(line);
      // Only treat as a function definition when no other function is open
      // (heuristic: definitions live at namespace/class level).
      if (m && !CONTROL_KEYWORDS[m[1]] && funcStack.length === 0) {
        funcStack.push({ name: m[1], startLine: li, depthAtOpen: braceDepth });
      }
      for (var ci = 0; ci < line.length; ci++) {
        if (line[ci] === '{') braceDepth++;
        else if (line[ci] === '}') {
          braceDepth--;
          if (funcStack.length && braceDepth === funcStack[funcStack.length - 1].depthAtOpen) {
            var f = funcStack.pop();
            functions.push({ name: f.name, startLine: f.startLine, endLine: li });
          }
        }
      }
    }
    // Unclosed function (user still typing) — extend to end of file.
    while (funcStack.length) {
      var uf = funcStack.pop();
      functions.push({ name: uf.name, startLine: uf.startLine, endLine: cleanLines.length - 1 });
    }

    // ---- pass 2: loops, nesting, recursion ----
    // Stack entries: { kind: 'loop'|'block', log: bool, headerLine, braces, expectingBrace, pendingSingleStmt }
    var loopStack = [];
    var maxCost = { nPow: 0, logPow: 0 };
    var hasRecursion = false;

    function currentCost() {
      var c = { nPow: 0, logPow: 0 };
      for (var i = 0; i < loopStack.length; i++) {
        if (loopStack[i].kind === 'loop') {
          if (loopStack[i].log) c.logPow++;
          else c.nPow++;
        }
      }
      return c;
    }

    function loopDepth() {
      var d = 0;
      for (var i = 0; i < loopStack.length; i++) if (loopStack[i].kind === 'loop') d++;
      return d;
    }

    for (var i2 = 0; i2 < cleanLines.length; i2++) {
      var clean = cleanLines[i2];
      var lineInfo = lines[i2];

      // Close single-statement loops (no braces) once their statement passed.
      while (loopStack.length &&
             loopStack[loopStack.length - 1].kind === 'loop' &&
             loopStack[loopStack.length - 1].singleStmt &&
             loopStack[loopStack.length - 1].headerLine < i2 &&
             /;\s*$/.test(cleanLines[i2 - 1] || '') &&
             !/^\s*\{/.test(clean)) {
        loopStack.pop();
      }

      lineInfo.loopDepth = loopDepth();

      // -- detect loop headers on this line --
      var forMatch = /\bfor\s*\(([\s\S]*?)\)/.exec(clean);
      var whileMatch = /\bwhile\s*\(([^)]*)\)/.exec(clean);
      var doMatch = /\bdo\b\s*\{?/.exec(clean);
      var isDoWhileTail = /}\s*while\s*\(/.test(clean);

      var opened = null;
      if (forMatch) {
        var isLog = isLogarithmicFor(forMatch[1]);
        opened = { kind: 'loop', log: isLog, headerLine: i2 };
      } else if (whileMatch && !isDoWhileTail) {
        // classify while by looking for halving/doubling inside its body
        var bodyPreview = cleanLines.slice(i2, Math.min(cleanLines.length, i2 + 30));
        var isLogW = LOG_STEP_RE.test(whileMatch[1]) || isLogarithmicBody(bodyPreview.slice(1));
        opened = { kind: 'loop', log: isLogW, headerLine: i2 };
      } else if (doMatch && !isDoWhileTail && /^\s*do\b/.test(clean)) {
        opened = { kind: 'loop', log: false, headerLine: i2 };
      }

      if (opened) {
        loopStack.push(opened);
        lineInfo.loopDepth = loopDepth();
        var cost = currentCost();
        if (costGreater(cost, maxCost)) maxCost = cost;
        var kindLabel = opened.log ? 'log-loop' : 'loop';
        var mult = opened.log ? 'log n' : 'n';
        lineInfo.annotations.push({
          type: kindLabel,
          depth: lineInfo.loopDepth,
          label: '× ' + mult + '  (depth ' + lineInfo.loopDepth + ', so far ' + costLabel(cost) + ')'
        });
        findings.push({
          line: i2 + 1,
          type: kindLabel,
          message: (opened.log
            ? 'Loop with halving/doubling step — runs about log n times.'
            : 'Loop — runs up to n times.') +
            ' Nesting depth ' + lineInfo.loopDepth + ', work inside this loop costs ' + costLabel(cost) + '.'
        });
        // Determine whether the loop uses braces: look for '{' on this line
        // or the next non-empty line.
        var hasBrace = /\{/.test(clean.slice(forMatch ? forMatch.index : (whileMatch ? whileMatch.index : 0)));
        if (!hasBrace) {
          var nx = i2 + 1;
          while (nx < cleanLines.length && cleanLines[nx].trim() === '') nx++;
          if (nx < cleanLines.length && /^\s*\{/.test(cleanLines[nx])) hasBrace = true;
        }
        // Loop body on the same line ending with ';' -> closes immediately.
        if (!hasBrace) {
          var afterHeader = clean.slice(clean.indexOf(')', (forMatch || whileMatch || { index: 0 }).index) + 1);
          if (/;\s*$/.test(afterHeader.trim()) && afterHeader.trim() !== ';') {
            loopStack.pop();
          } else {
            opened.singleStmt = true;
          }
        }
      }

      // -- recursion detection --
      for (var fi = 0; fi < functions.length; fi++) {
        var fn = functions[fi];
        if (i2 > fn.startLine && i2 <= fn.endLine) {
          var callRe = new RegExp('(?:^|[^\\w.])' + fn.name + '\\s*\\(');
          if (callRe.test(clean)) {
            hasRecursion = true;
            lineInfo.annotations.push({
              type: 'recursion',
              depth: lineInfo.loopDepth,
              label: 'recursive call to ' + fn.name + '()'
            });
            findings.push({
              line: i2 + 1,
              type: 'recursion',
              message: 'Recursive call to ' + fn.name + '() — complexity is defined by its recurrence relation ' +
                       '(how many recursive calls are made and how much the input shrinks each call).'
            });
          }
        }
      }

      // -- track braces to close loop scopes --
      for (var ci2 = 0; ci2 < clean.length; ci2++) {
        var ch = clean[ci2];
        if (ch === '{') {
          // Attach the brace to the innermost pending construct, or push a plain block.
          var top = loopStack[loopStack.length - 1];
          if (top && top.kind === 'loop' && top.braces === undefined && !top.singleStmt) {
            top.braces = 1;
          } else if (top && top.kind === 'loop' && top.braces !== undefined) {
            top.braces++;
          } else {
            loopStack.push({ kind: 'block', braces: 1 });
            top = loopStack[loopStack.length - 1];
          }
        } else if (ch === '}') {
          var top2 = loopStack[loopStack.length - 1];
          if (top2 && top2.braces !== undefined) {
            top2.braces--;
            if (top2.braces === 0) loopStack.pop();
          }
        }
      }
      // A single-statement loop whose body ended on this line closes now.
      while (loopStack.length &&
             loopStack[loopStack.length - 1].kind === 'loop' &&
             loopStack[loopStack.length - 1].singleStmt &&
             loopStack[loopStack.length - 1].braces === undefined &&
             loopStack[loopStack.length - 1].headerLine <= i2 &&
             /;\s*$/.test(clean)) {
        loopStack.pop();
      }
    }

    var overall = costLabel(maxCost);
    return {
      lines: lines,
      findings: findings,
      overall: overall,
      hasRecursion: hasRecursion
    };
  }

  var api = { analyze: analyze, costLabel: costLabel, _strip: stripCommentsAndStrings };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ComplexityAnalyzer = api;
})(typeof window !== 'undefined' ? window : this);
