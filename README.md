# companion-module-christie-rgblaser
A Bitfocus Companion Module offering Serial Control over TCP for the latest Christie RGB Laser Projectors

## Objectives

**v0.0.1**

The initial focus of this module is simple power, shutter/douser, and channel selection to assist with some degree os automation in a room dealing with multiple sources all connected to the same projector/s.

Serial Control documentation for the latest RealLaser Projectors are documented here: https://www.christiedigital.com/globalassets/resources/public/020-102714-01-christie-lit-tech-ref-cinelife-v2.2.0.pdf

## Acknowledgements

This effort is deeply indebted to the work already done for older projectors in companion-module-christie-projector for which I am very grateful. Per Røine's original module is here: https://github.com/bitfocus/companion-module-christie-projector


## TO DO

-[x] Create New Repo following correct mnaming convention
-[x] Create Package json file desribing the project accurately
-[x] Create initial index.js file (adapting the christie-projector approach
-[ ] Test on a local instance (Raspberry Pi4) as a local module (how?) against CP4325
-[ ] Test against multiple Projectors
-[ ] Ask for community help testing against other RGB lasers and soliciting feedback on bugs etc
-[ ] Have a beer


## Targeted Projectors

Projector Type | Projector Notes | Testing Outcome
---------------|-----------------|----------------
CP4325-RGB     | Discontinued Nov 27, 2019 | Initial Test Projectors are this type
CP4430-RGB     | Current Cinelife+ Projector |
CP4450-RGB     | Current Cinelife+ Projector |
CP4440-RGB     | Current Cinelife+ Projector |
CP4420-RGB     | Current Cinelife+ Projector |
CP4415-RGB     | Current Cinelife+ Projector | Probably Next Projector to test against
