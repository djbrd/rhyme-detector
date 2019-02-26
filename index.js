const cmu_dictionary = require("cmu-pronouncing-dictionary");

const getArpabet = word => cmu_dictionary[word];

const getRelationshipMatrix = (phonemes, maxDistance) => {
  const matrix = [];
  for (let distance = 1; distance <= maxDistance; distance++) {
    const similarities = [];
    for (let pos = 0; pos < phonemes.length - distance; pos++) {
      const p0 = phonemes[pos];
      const p1 = phonemes[pos + distance];
      if (p0 === p1 && p0 !== "") {
        similarities.push(1);
      } else {
        similarities.push(0);
      }
    }

    matrix.push(similarities);
  }

  return matrix;
};

const isVowel = phoneme => phoneme.length > 2;

class Rhyme {
  constructor(indices, similarity) {
    this.indices = indices;
    this.pattern = [similarity];
    this.hasUnrelatedVowels = false;
  }

  terminate() {
    while (this.pattern.length && this.pattern[this.pattern.length - 1] <= 0) {
      this.pattern.pop();
    }

    return this.pattern.length;
  }

  addRelated(similarity) {
    this.pattern.push(similarity);
  }

  addUnrelated(p0, p1) {
    if (isVowel(p0) !== isVowel(p1)) {
      return false;
    }

    if (this.hasUnrelatedPhonemes()) {
      if (isVowel(p0) === this.hasUnrelatedVowels) {
        this.pattern.push(0);
        return true;
      }
    } else {
      this.hasUnrelatedVowels === isVowel(0);
      this.pattern.push(0);
      return true;
    }
    return false;
  }

  hasUnrelatedPhonemes() {
    return this.pattern.indexOf(0) !== -1;
  }

  length() {
    return this.pattern.length;
  }
}

const getRhymesFromMatrix = (matrix, phonemes) => {
  const rhymes = [];
  let rhyme = null;

  matrix.forEach((similarities, mIdx) => {
    distance = mIdx + 1;
    similarities.forEach((similarity, sIdx) => {
      const p0 = phonemes[sIdx];
      if (similarity <= 0) {
        if (rhyme) {
          let p1 = phonemes[sIdx + distance];
          if (!p0 || !p1 || !rhyme.addUnrelated(p0, p1)) {
            if (rhyme.terminate()) {
              rhymes.push(rhyme);
            }
            rhyme = null;
          }
        }
      } else {
        if (rhyme) {
          rhyme.addRelated(similarity);
        } else {
          rhyme = new Rhyme([sIdx, sIdx + distance], similarity);
        }
      }

      // A sequence should not overlap with itself
      if (rhyme && rhyme.length() >= distance) {
        if (rhyme.terminate()) {
          rhymes.push(rhyme);
        }
        rhyme = null;
      }
    });

    // End rhyme at the end of the verse
    if (rhyme) {
      if (rhyme.terminate()) {
        rhymes.push(rhyme);
      }
      rhyme = null;
    }
  });

  // Do what with the rhyme?
  return rhymes;
};

exports.getRhymeScore = str => {
  str = str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, "") // Remove all punctuation apart from apostrophes
    .replace("-", " ") // Remove hyphens
    .replace(/\s+/g, " "); // Remove spaces

  // Split resulting string into words
  const words = str.split(" ");
  words.forEach(word => console.log(word));

  // Convert words to phonemes (arpabet)
  const phonemes = words
    .map(word => {
      const arpabet = getArpabet(word);
      return arpabet === undefined
        ? Array(word.length).fill("")
        : arpabet.split(" ");
    })
    .flat();

  const matrix = getRelationshipMatrix(phonemes, 50);
  const rhymes = getRhymesFromMatrix(matrix, phonemes);

  return rhymes.length * 10;
};

//let str = `In the beginning we were winning`;
//getRhymeScore(str);
