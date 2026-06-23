/* ============================================================
   Word lists & pattern data used across the engines.
   Kept small and dependency-free on purpose.
   ============================================================ */

const WORDLISTS = {
  // Nouns used for passphrase / cognitive-optimized generation
  nouns: [
    "River","Tiger","Galaxy","Coffee","Mountain","Falcon","Comet","Garden",
    "Harbor","Lantern","Canyon","Forest","Ember","Glacier","Meadow","Rocket",
    "Phoenix","Anchor","Beacon","Orchard","Quartz","Summit","Voyage","Willow",
    "Cobalt","Drift","Echo","Frost","Horizon","Ivory","Jungle","Kestrel",
    "Lagoon","Marble","Nimbus","Onyx","Pebble","Quill","Ridge","Storm",
    "Thicket","Umber","Vortex","Wander","Zephyr","Cinder","Dune","Flint"
  ],
  adjectives: [
    "Blue","Silent","Wild","Golden","Hidden","Swift","Crimson","Lucky",
    "Brave","Quiet","Bold","Frozen","Bright","Lone","Stormy","Distant",
    "Rapid","Gentle","Fierce","Calm","Amber","Sharp","Deep","Vivid",
    "Noble","Sly","Cosmic","Rustic","Solar","Lunar","Iron","Velvet"
  ],
  // Common short dictionary words used to detect "meaningful word" usage
  // inside arbitrary passwords (kept short on purpose; substring scan)
  commonWords: [
    "password","login","welcome","admin","letmein","monkey","dragon",
    "master","shadow","football","baseball","sunshine","princess","summer",
    "winter","spring","autumn","love","hello","secret","ninja","trustno",
    "freedom","whatever","qwerty","iloveyou","starwars","batman","superman",
    "love","hate","money","happy","family","friend","music","dance"
  ],
  separators: ["-", "_", ".", "*", "+", "~"]
};

// Sequences and keyboard paths used for pattern-recognition checks
const PATTERN_DATA = {
  sequencesAsc: "abcdefghijklmnopqrstuvwxyz0123456789",
  sequencesDesc: "zyxwvutsrqponmlkjihgfedcba9876543210",
  keyboardRows: [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
    "1234567890",
    "qazwsxedcrfvtgbyhnujmik,ol.p;/"
  ],
  // Frequently reused full passwords, used as an instant "very weak" flag
  knownWeak: [
    "password","123456","123456789","qwerty","abc123","password1",
    "111111","12345678","123123","letmein","iloveyou","admin","welcome",
    "monkey","dragon","football","master","trustno1","000000","696969"
  ]
};
