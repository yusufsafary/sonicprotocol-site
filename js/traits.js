// Shared by the API and the browser. Every trait is derived from the on-chain seed. Open source, no hidden rolls.
(function (root) {
  const TIERS = [
    { key: 'tone', name: 'Tone', rarity: 'Common', c1: '#FFD2B3', c2: '#FF9E8C', ink: '#7A3B2E' },
    { key: 'chord', name: 'Chord', rarity: 'Rare', c1: '#E2D4FF', c2: '#AE92FF', ink: '#4B3591' },
    { key: 'harmony', name: 'Harmony', rarity: 'Epic', c1: '#BDF3DB', c2: '#9BCBFF', ink: '#1E5E58' },
    { key: 'boom', name: 'Sonic Boom', rarity: 'Legendary', c1: '#FFEA94', c2: '#FFBE2E', ink: '#7A4F00' },
  ];
  const SPECIES = [
    ['Peach', 'Sky', 'Mint', 'Lilac', 'Butter', 'Bubblegum'],
    ['Lilac', 'Peach', 'Sky', 'Mint'],
    ['Mint', 'Rose', 'Moon'],
    ['Gold', 'Pearl'],
  ];
  const WAVES = ['sine', 'triangle', 'square', 'sawtooth'];
  const PENTA = [0, 2, 4, 7, 9]; // C D E G A
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const big = (s) => (typeof s === 'bigint' ? s : BigInt(s));
  function noteOf(seed) {
    const s = big(seed);
    const i = Number(s % 15n);
    const midi = 48 + 12 * Math.floor(i / 5) + PENTA[i % 5]; // C3..A5
    return { midi, name: NAMES[midi % 12] + (Math.floor(midi / 12) - 1), hz: Math.round(440 * Math.pow(2, (midi - 69) / 12) * 100) / 100 };
  }
  function traits(id, tier, seed, parentSeeds) {
    const s = big(seed);
    const sp = Number((s >> 16n) % BigInt(SPECIES[tier].length));
    const wave = WAVES[Number((s >> 8n) % 4n)];
    const root = noteOf(s);
    const chord = tier > 0 && parentSeeds && parentSeeds.length === 3 ? parentSeeds.map(noteOf) : null;
    return {
      id, tier, tierName: TIERS[tier].name, rarity: TIERS[tier].rarity, species: SPECIES[tier][sp], speciesIndex: sp,
      art: `${TIERS[tier].key}-${sp + 1}`, wave, note: root, chord, palette: TIERS[tier],
      title: `${SPECIES[tier][sp]} ${TIERS[tier].name}`,
    };
  }
  const api = { TIERS, SPECIES, WAVES, noteOf, traits };
  if (typeof module !== 'undefined') module.exports = api; else root.SonicTraits = api;
})(this);
