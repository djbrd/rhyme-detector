const cmu_dictionary = require("cmu-pronouncing-dictionary");

const RHYME_SCORE = 10;
const KEYWORD_SCORE = 20;
const KEY_PHRASE_SCORE = 50;

// Flatten arrays is experimental feature in recent versions of Node.js, AWS Lambda doesn't support it
const flatten = (arr, result = []) => {
  for (let i = 0, length = arr.length; i < length; i++) {
    const value = arr[i];
    if (Array.isArray(value)) {
      flatten(value, result);
    } else {
      result.push(value);
    }
  }
  return result;
};

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

  isDuplicateOf(other) {
    if (
      other.indices[0] === this.indices[0] &&
      other.pattern.join() == this.pattern.join()
    ) {
      return true;
    }
    return false;
  }
}

const terminateAndAddRhyme = (rhyme, rhymes) => {
  if (
    rhyme.terminate() &&
    !rhymes.some(existing => rhyme.isDuplicateOf(existing))
  ) {
    rhymes.push(rhyme);
  }
  return null;
};

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
            rhyme = terminateAndAddRhyme(rhyme, rhymes);
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
        rhyme = terminateAndAddRhyme(rhyme, rhymes);
      }
    });

    // End rhyme at the end of the verse
    if (rhyme) {
      rhyme = terminateAndAddRhyme(rhyme, rhymes);
    }
  });

  // Do what with the rhyme?
  return rhymes;
};

const purgeString = str => {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, "") // Remove all punctuation apart from apostrophes
    .replace("-", " ") // Remove hyphens
    .replace(/\s+/g, " "); // Remove spaces
};

const getPhonemes = str => {
  str = purgeString(str);

  // Split resulting string into words
  const words = str.split(" ");

  // Convert words to phonemes (arpabet)
  const phonemes = flatten(words
    .map(word => {
      const arpabet = getArpabet(word);
      return arpabet === undefined
        ? Array(word.length).fill("")
        : arpabet.split(" ");
    }));

  return phonemes;
};

const getRhymes = str => {
  const phonemes = getPhonemes(str);
  const matrix = getRelationshipMatrix(phonemes, 50);
  const rhymes = getRhymesFromMatrix(matrix, phonemes);
  return rhymes;
};

const getRhymeScore = input => {
  const str = purgeString(input);
  const rhymes = getRhymes(str);
  return rhymes.length * RHYME_SCORE;
};

const getKeywordScore = (str, keywords) => {
  const count = keywords.reduce((count, keyword) => {
    return str.indexOf(keyword.toLowerCase()) > -1 ? ++count : count;
  }, 0);
  return count * KEYWORD_SCORE;
};

const getKeyPhraseScore = (str, keyPhrases) => {
  const count = keyPhrases.reduce((count, keyPhrase) => {
    return str.indexOf(purgeString(keyPhrase)) > -1 ? ++count : count;
  }, 0);
  return count * KEY_PHRASE_SCORE;
};

const getScore = (input, keywords = [], keyPhrases = []) => {
  const str = purgeString(input);
  const rhymeScore = getRhymeScore(str);
  const keywordScore = getKeywordScore(str, keywords);
  const keyPhraseScore = getKeyPhraseScore(str, keyPhrases);
  return rhymeScore + keywordScore + keyPhraseScore;
};

exports.getRhymeScore = getRhymeScore;
exports.getScore = getScore;

//let str = `Here to create, too late to hate`;
//console.log(exports.getScore(str, ["wait", "late"], ["Here to create"]));
