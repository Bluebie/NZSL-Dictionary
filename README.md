NZSL-Dictionary
===============

This package contains a node js script, which scrapes the entire library of
signs from https://nzsl.vuw.ac.nz, downloading videos of each sign, and usage
videos, with each sign labeled by an integer ID number, and the sequence of
signs in usage videos labeled in order (without timing info). It also has each
sign's position and handshape labeled.

Information is organised in to 3 folders:

 - `/data` - json files with metadata and labels, for each sign in the set
 - `/video` - numbered folders, sign demonstration and example usage videos
 referenced in data
 - `/image` - images of handshapes, locations, and individual illustrations of
 each sign

You'll also find scrape.js, which generated this dataset, and can be used to
update it in the future.

Data Information
================

An example sign metadata file, annotated with information about each field:

```javascript
// taken from /data/676.json
{
  // nzsl_id is the ID number found in the URL on the NZSL website. newer signs
  // have higher numbers, and some numbers do not have a sign, presumably
  // deleted at some point numbers do not seem to be reused. They are treated
  // as unique addresses in this dataset
  "nzsl_id": 676,
  // translation info is provided in the gloss, in both english and maori
  "gloss": {
    "english": ["balance"],
    "english_secondary": ["equation", "level"],
    "maori": ["ka hē noa iho"],
    "attributes": ["noun", "verb"]
  },
  // the video file demonstrating the sign is specified. this video can be found
  // at /video/676/balance.676.main_glosses.mb.r480x360.mp4
  "video": "balance.676.main_glosses.mb.r480x360.mp4",
  // usages provide examples of this sign used in context. some signs have
  // multiple usages listed
  "usage": [
    {
      // usage video path /video/676/balance.676.finalexample1.mb.r480x360.mp4
      "video": "balance.676.finalexample1.mb.r480x360.mp4",
      // signs is an ordered list of the signs shown in the video referenced
      // established signs are listed with a nzsl_id number, and classifier
      // signs are listed as a string in the format cl:plain-text-gloss
      // refer to https://nzsl.vuw.ac.nz/classifiers/ for info on classifier signs
      // and note, most usage videos in this collection do not include classifier
      "signs": [2297, 3382, "cl:get-on-horse", 4581, 676, "cl:fall-off-horse"],
      // an explanation of the meaning of the usage video, in English.
      "translation": "He mounted a horse but lost his balance and fell off."
    }
  ],
  // attributes of the sign. You can expect a handshape and a location to be
  // listed and can treat these filenames as unique id's for each position and
  // handshape. the images can be found in /image/handshape.1.1.1-...png etc
  "attributes": {
    "handshapes": ["handshape.1.1.1-f5d9aca796fcb8a045553fa69be32b9a3f2cb2abcbe9639923f8a00189ea3da8.png"],
    "locations": ["location.1.1.in_front_of_body-9dd4eb3a77c2bc0fc515de633c0b0cc4d5b11fb1cabcb2d5578dc9d7a8b03ff2.png"]
  },
  // black and white cartoon illustration of the sign, available in /image/
  "image": "balance-676.png"
}
```

Where are the videos?!
======================

Github doesn't love having gigabytes of files synced to it, so I've excluded the
contents of /video/ from the repo. You can download the video archive from
TODO: Add link

Copyright
=========

This dictionary dataset is originally and continues to be released under
Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
https://creativecommons.org/licenses/by-nc-sa/3.0

scrape.js source code and associated data structures are released as public
domain.
