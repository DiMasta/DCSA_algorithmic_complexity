/* UI wiring: read the textarea, run the analyzer, render highlighted code. */
(function () {
  'use strict';

  var input = document.getElementById('code-input');
  var button = document.getElementById('analyze-btn');
  var resultSection = document.getElementById('result-section');
  var overallBadge = document.getElementById('overall-badge');
  var overallNote = document.getElementById('overall-note');
  var codeView = document.getElementById('code-view');
  var findingsBox = document.getElementById('findings');
  var exampleSelect = document.getElementById('example-select');

  exampleSelect.addEventListener('change', function () {
    var key = exampleSelect.value;
    if (key && window.EXAMPLES[key]) {
      input.value = window.EXAMPLES[key];
      resultSection.hidden = true;
    }
  });

  button.addEventListener('click', function () {
    var code = input.value;
    if (!code.trim()) {
      input.focus();
      return;
    }
    var result = window.ComplexityAnalyzer.analyze(code);
    render(result);
  });

  // Ctrl+Enter / Cmd+Enter inside the textarea also analyzes.
  input.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      button.click();
    }
  });

  function highlightClass(line) {
    // Priority: recursion > log-loop header > loop header (by depth) > body of a loop.
    var hasRecursion = line.annotations.some(function (a) { return a.type === 'recursion'; });
    var logLoop = line.annotations.some(function (a) { return a.type === 'log-loop'; });
    var loop = line.annotations.some(function (a) { return a.type === 'loop'; });
    if (hasRecursion) return 'hl-recursion';
    if (logLoop) return 'hl-log-loop';
    if (loop) return 'hl-depth-' + Math.min(line.loopDepth, 3);
    return '';
  }

  function tagClass(annotation, depth) {
    if (annotation.type === 'recursion') return 'tag-recursion';
    if (annotation.type === 'log-loop') return 'tag-log-loop';
    return 'tag-depth-' + Math.min(depth, 3);
  }

  function render(result) {
    resultSection.hidden = false;

    overallBadge.textContent = result.overall;
    if (result.hasRecursion) {
      overallNote.textContent = '(loops only — recursion detected, see the notes below for the recurrence)';
    } else if (result.overall === 'O(1)') {
      overallNote.textContent = '(no loops or recursive calls found)';
    } else {
      overallNote.textContent = '(from the deepest chain of nested loops)';
    }

    // --- annotated code ---
    codeView.textContent = '';
    result.lines.forEach(function (line) {
      var row = document.createElement('div');
      row.className = 'code-line';
      row.id = 'code-line-' + line.number;
      var hl = highlightClass(line);
      if (hl) row.className += ' ' + hl;

      var no = document.createElement('span');
      no.className = 'line-no';
      no.textContent = line.number;
      row.appendChild(no);

      var text = document.createElement('span');
      text.className = 'line-text';
      text.textContent = line.text.length ? line.text : ' ';
      row.appendChild(text);

      line.annotations.forEach(function (a) {
        var tag = document.createElement('span');
        tag.className = 'line-tag ' + tagClass(a, line.loopDepth);
        tag.textContent = a.label;
        row.appendChild(tag);
      });

      codeView.appendChild(row);
    });

    // --- findings list ---
    findingsBox.textContent = '';
    var h = document.createElement('h2');
    h.textContent = 'Steps to consider (' + result.findings.length + ')';
    findingsBox.appendChild(h);

    if (!result.findings.length) {
      var p = document.createElement('p');
      p.className = 'none';
      p.textContent = 'No loops or recursive calls found — every statement runs a constant number of times, so this code is O(1).';
      findingsBox.appendChild(p);
    } else {
      var ol = document.createElement('ol');
      result.findings.forEach(function (f) {
        var li = document.createElement('li');
        var lineRef = document.createElement('span');
        lineRef.className = 'f-line';
        lineRef.textContent = 'Line ' + f.line + ':';
        lineRef.addEventListener('click', function () {
          var row = document.getElementById('code-line-' + f.line);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            row.classList.remove('flash');
            // restart the animation
            void row.offsetWidth;
            row.classList.add('flash');
          }
        });
        li.appendChild(lineRef);
        li.appendChild(document.createTextNode(' ' + f.message));
        ol.appendChild(li);
      });
      findingsBox.appendChild(ol);
    }

    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
})();
