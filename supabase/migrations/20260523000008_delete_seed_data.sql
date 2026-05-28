-- Remove the 10 demo shops that were inserted by the original seed migration.
DELETE FROM shops
WHERE ig_handle IN (
  'vintagevaulthk',
  'skinlabhk',
  'cottonandcloud',
  'printsbymingk',
  'annieandstonehk',
  'bakehousehk',
  'greenlifestoreig',
  'readingcornerhk',
  'wellnessharbour',
  'digitalcreationshk'
);
