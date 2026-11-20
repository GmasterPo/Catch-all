#!/bin/sh
# game.ts is stored as four ordered parts because it is larger than a single
# repository write from the tools that produced this backup. The part files
# are line-aligned but do not carry the newline that ends their last line, so
# each seam needs one inserted; run this from anywhere and it rebuilds the file
# next to the parts.
set -e
cd "$(dirname "$0")"
{
  cat game.ts.part1
  echo
  cat game.ts.part2
  echo
  cat game.ts.part3
  echo
  cat game.ts.part4
} > game.ts
echo "wrote $(pwd)/game.ts, $(wc -c < game.ts) bytes"
