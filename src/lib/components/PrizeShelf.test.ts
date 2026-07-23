import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PrizeShelf from './PrizeShelf.svelte';

const prizes = [
  {
    id: 'secret-prize',
    requiredPoints: 1500,
    title: 'Süße Belohnung',
    description: 'Ein Lieblingssnack.',
    image: 'sweet.svg',
    imageAlt: 'Eine Torte.'
  }
];

describe('PrizeShelf', () => {
  it('keeps prize details secret until the threshold is reached', async () => {
    const onSelectPrize = vi.fn();
    const view = render(PrizeShelf, {
      prizes,
      score: 0,
      revealedPrizeIds: [],
      imageUrl: (path) => path,
      onSelectPrize
    });

    expect(screen.queryByText('Süße Belohnung')).not.toBeInTheDocument();
    expect(screen.queryByText('Ein Lieblingssnack.')).not.toBeInTheDocument();
    expect(screen.getByText('Geheimer Preis')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Eine Torte.' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Geheimer Preis bei 1.500 Punkten' })).toBeDisabled();

    await view.rerender({ prizes, score: 1500, revealedPrizeIds: [], imageUrl: (path) => path, onSelectPrize });
    expect(screen.queryByText('Süße Belohnung')).not.toBeInTheDocument();
    expect(screen.getByText('Freigeschalteter Preis')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Freigeschalteter Preis für 1.500 Punkte öffnen' }));
    expect(onSelectPrize).toHaveBeenCalledWith(prizes[0]);

    await view.rerender({
      prizes,
      score: 1500,
      revealedPrizeIds: ['secret-prize'],
      imageUrl: (path) => path,
      onSelectPrize
    });
    expect(screen.getByText('Süße Belohnung')).toBeInTheDocument();
    expect(screen.getByText('Ein Lieblingssnack.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Eine Torte.' })).toBeInTheDocument();
  });
});
