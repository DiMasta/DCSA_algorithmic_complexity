/* Teaching examples selectable from the dropdown. */
(function (global) {
  'use strict';

  global.EXAMPLES = {
    constant: [
      '// O(1) — constant time: no loops, no recursion.',
      'int getMiddle(const std::vector<int>& v) {',
      '    int mid = v.size() / 2;',
      '    return v[mid];',
      '}'
    ].join('\n'),

    logarithmic: [
      '// O(log n) — binary search: the range is halved each step.',
      'int binarySearch(const std::vector<int>& a, int target) {',
      '    int low = 0;',
      '    int high = (int)a.size() - 1;',
      '    while (low <= high) {',
      '        int mid = (low + high) / 2;',
      '        if (a[mid] == target) return mid;',
      '        if (a[mid] < target) low = mid + 1;',
      '        else high = mid - 1;',
      '    }',
      '    return -1;',
      '}'
    ].join('\n'),

    linear: [
      '// O(n) — one loop over all n elements.',
      'int sum(const std::vector<int>& a) {',
      '    int total = 0;',
      '    for (int i = 0; i < (int)a.size(); i++) {',
      '        total += a[i];',
      '    }',
      '    return total;',
      '}'
    ].join('\n'),

    nlogn: [
      '// O(n log n) — outer loop runs n times,',
      '// inner loop doubles its counter, so it runs log n times.',
      'void demo(int n) {',
      '    for (int i = 0; i < n; i++) {',
      '        for (int j = 1; j < n; j *= 2) {',
      '            doWork(i, j);',
      '        }',
      '    }',
      '}'
    ].join('\n'),

    quadratic: [
      '// O(n^2) — bubble sort: two nested loops over n elements.',
      'void bubbleSort(std::vector<int>& a) {',
      '    int n = (int)a.size();',
      '    for (int i = 0; i < n - 1; i++) {',
      '        for (int j = 0; j < n - i - 1; j++) {',
      '            if (a[j] > a[j + 1]) {',
      '                std::swap(a[j], a[j + 1]);',
      '            }',
      '        }',
      '    }',
      '}'
    ].join('\n'),

    cubic: [
      '// O(n^3) — naive matrix multiplication: three nested loops.',
      'void multiply(const Matrix& A, const Matrix& B, Matrix& C, int n) {',
      '    for (int i = 0; i < n; i++) {',
      '        for (int j = 0; j < n; j++) {',
      '            for (int k = 0; k < n; k++) {',
      '                C[i][j] += A[i][k] * B[k][j];',
      '            }',
      '        }',
      '    }',
      '}'
    ].join('\n'),

    recursion: [
      '// Recursion — the complexity comes from the recurrence relation:',
      '// factorial: T(n) = T(n-1) + O(1)      => O(n)',
      '// fibonacci: T(n) = T(n-1) + T(n-2)    => O(2^n)',
      'long long factorial(int n) {',
      '    if (n <= 1) return 1;',
      '    return n * factorial(n - 1);',
      '}',
      '',
      'long long fibonacci(int n) {',
      '    if (n <= 1) return n;',
      '    return fibonacci(n - 1) + fibonacci(n - 2);',
      '}'
    ].join('\n')
  };
})(typeof window !== 'undefined' ? window : this);
