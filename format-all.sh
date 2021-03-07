#!/usr/bin/env bash

docker run --volume "$PWD:/work" tmknom/prettier --config=./prettier.json --write web/*.js

