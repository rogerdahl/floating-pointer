#!/usr/bin/env bash

cd "$(dirname "$0")" || exit
docker run --volume "$PWD:/work" tmknom/prettier --config=./prettier.json --write web/*.js web/*.css
rustfmt --edition 2018 src/*.rs
