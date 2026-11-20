#!/bin/sh
# game.ts is stored as four ordered parts because it is larger than a single
# repository write from the tools that produced this backup.
#
# The parts cover the file end to end. part1 ends mid-statement, part2 opens
# with the newline that ends part1's last line, part3 opens with the body of
# that next line and part4 opens with the newline that ends part3. One seam
# therefore needs a newline inserted; running this script from anywhere rebuilds
# game.ts next to the parts, byte for byte.
set -e
cd "$(dirname "$0")"
{
  cat game.ts.part1
  cat game.ts.part2
  echo
  cat game.ts.part3
  cat game.ts.part4
} > game.ts
printf 'wrote %s/game.ts, %s bytes\n' "$(pwd)" "$(wc -c < game.ts)"
