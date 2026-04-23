import { describe, it, expect } from 'vitest'
import type { NasaImage } from '@/lib/types/nasa'
import { continueLabel, canSelectMore, toggleSelection, removeFromSelection } from './selection'

function makeImg(id: string): NasaImage {
  return { assetId: id, thumbUrl: '', fullUrl: '', instrument: '', date: '', nasaUrl: '' }
}

describe('continueLabel', () => {
  it('returns skip label when count is 0', () => {
    expect(continueLabel(0)).toBe('Skip to query →')
  })

  it('returns singular label when count is 1', () => {
    expect(continueLabel(1)).toBe('Continue with 1 image →')
  })

  it('returns plural label when count is 2', () => {
    expect(continueLabel(2)).toBe('Continue with 2 images →')
  })

  it('returns plural label when count is 3', () => {
    expect(continueLabel(3)).toBe('Continue with 3 images →')
  })

  it('returns plural label when count is 4', () => {
    expect(continueLabel(4)).toBe('Continue with 4 images →')
  })
})

describe('canSelectMore', () => {
  it('returns true for empty selection', () => {
    expect(canSelectMore([])).toBe(true)
  })

  it('returns true when 3 images are selected', () => {
    const imgs = [makeImg('a'), makeImg('b'), makeImg('c')]
    expect(canSelectMore(imgs)).toBe(true)
  })

  it('returns false when 4 images are selected', () => {
    const imgs = [makeImg('a'), makeImg('b'), makeImg('c'), makeImg('d')]
    expect(canSelectMore(imgs)).toBe(false)
  })
})

describe('toggleSelection', () => {
  it('adds an image to empty selection', () => {
    const img1 = makeImg('a')
    expect(toggleSelection([], img1)).toEqual([img1])
  })

  it('adds an image to a non-empty selection', () => {
    const img1 = makeImg('a')
    const img2 = makeImg('b')
    expect(toggleSelection([img1], img2)).toEqual([img1, img2])
  })

  it('removes first image when it is already selected', () => {
    const img1 = makeImg('a')
    const img2 = makeImg('b')
    expect(toggleSelection([img1, img2], img1)).toEqual([img2])
  })

  it('removes the only image when it is already selected', () => {
    const img1 = makeImg('a')
    expect(toggleSelection([img1], img1)).toEqual([])
  })

  it('removes a middle image from a three-image selection', () => {
    const img1 = makeImg('a')
    const img2 = makeImg('b')
    const img3 = makeImg('c')
    expect(toggleSelection([img1, img2, img3], img2)).toEqual([img1, img3])
  })
})

describe('removeFromSelection', () => {
  it('removes image by assetId', () => {
    const img1 = makeImg('a')
    const img2 = makeImg('b')
    expect(removeFromSelection([img1, img2], 'a')).toEqual([img2])
  })

  it('is a no-op when assetId is not in selection', () => {
    const img1 = makeImg('a')
    expect(removeFromSelection([img1], 'zzz')).toEqual([img1])
  })

  it('returns empty array when selection is empty', () => {
    expect(removeFromSelection([], 'any')).toEqual([])
  })
})
