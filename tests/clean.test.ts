import { describe, expect, it } from 'vitest'
import { cleanText, joinLines, joinSplitWords, countWords } from '../src/clean'

describe('hyphen joining', () => {
  it('joins a word hyphenated across a line break', () => {
    expect(joinLines(['Ta tuli koju ja vaa-', 'tas aknast välja.'])).toBe('Ta tuli koju ja vaatas aknast välja.')
  })
  it('keeps the hyphen of a real compound', () => {
    expect(joinLines(['Ta sõitis Kesk-', 'Eestisse.'])).toBe('Ta sõitis Kesk-Eestisse.')
  })
  it('keeps a free-standing dash', () => {
    expect(joinLines(['Ta ütles -', 'ei.'])).toBe('Ta ütles - ei.')
  })
})

describe('paragraph cleanup', () => {
  const raw = [
    'Esimene lõik algab siin ja jätkub järgmisel',
    'real ilma tühja reata vahepeal, nagu raamatus.',
    '',
    '  12  ',
    'Teine lõik on pikk ja jookseb samuti üle mitme',
    'rea, kuni lõpuks see lõpeb lühikese reaga.',
    'Lõpp.',
    'Kolmas lõik algab kohe pärast lühikest rida ja',
    'lõpeb siin.',
  ].join('\n')

  it('joins lines into paragraphs and drops page numbers', () => {
    expect(cleanText(raw)).toEqual([
      'Esimene lõik algab siin ja jätkub järgmisel real ilma tühja reata vahepeal, nagu raamatus.',
      'Teine lõik on pikk ja jookseb samuti üle mitme rea, kuni lõpuks see lõpeb lühikese reaga. Lõpp.',
      'Kolmas lõik algab kohe pärast lühikest rida ja lõpeb siin.',
    ])
  })
  it('drops page numbers with dashes', () => {
    expect(cleanText('– 7 –\nTekst.')).toEqual(['Tekst.'])
  })
})

describe('spaced-out words', () => {
  it('joins when the full word appears elsewhere', () => {
    const vocab = countWords('Ta on seda kirjeldanud. Ta on kirjel danud')
    expect(joinSplitWords('Ta on kirjel danud.', vocab)).toBe('Ta on kirjeldanud.')
  })
  it('does not join two common words', () => {
    const vocab = countWords('ta ja taja ta ja ta ja')
    expect(joinSplitWords('ta ja', vocab)).toBe('ta ja')
  })
  it('does not join without evidence', () => {
    expect(joinSplitWords('kirjel danud', countWords('kirjel danud'))).toBe('kirjel danud')
  })
})
