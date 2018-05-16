# Troubleshooting
This document will help you check for common issues and make sure your issue has not already been reported.

## NPM global package permissions problem
We recommend installing NPM global packages **without** sudo. If you encountered issues when tried to install `ethstats-cli` as a global package with or without sudo regarding permissions, we recommend using this script [npm-global-no-sudo](https://github.com/baxy/npm-global-no-sudo) to fix the issue.

## Binaries not found
If you installed `ethstats-cli` as a global package with Yarn and the binaries are not found, we recommend running the following command:
```
export PATH="$PATH:`yarn global bin`" && echo 'export PATH="$PATH:`yarn global bin`"' >> ~/.profile
```
