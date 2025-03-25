const filterPatterns = [
  /<assistant>/,
  /<user>/,
  /<task>/,
  /<expected_result>/,
  /<context>/,
  /<TASK_DONE>/,
  /Instructions:/,
  /Expected Result:/,
  /Solution:/,
];

export function removeFilterPatterns(stream: string) {
  return filterPatterns.reduce((acc, pattern) => {
    const result = acc.replace(pattern, '');
    return result ? result : acc;
  }, stream);
}
