# Documentation of Ekylibre

This project containt the following informations

* User Documentation for Ekylibre solution

## compile the documentation (HTML and PDF)

`cd doc`

`bundler install`

`bundler exec nanoc`

Go to output of your working directory

## launch live version

`cd doc`

`bundler exec nanoc live`

Go to http://localhost:3000

## deploy

Push to `master` — `.github/workflows/pages.yml` builds and publishes to GitHub Pages at https://ekylibre.github.io/doc/.
