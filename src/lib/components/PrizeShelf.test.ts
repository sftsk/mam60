import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
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
    const view = render(PrizeShelf, { prizes, score: 0, imageUrl: (path) => path });

    expect(screen.queryByText('Süße Belohnung')).not.toBeInTheDocument();
    expect(screen.queryByText('Ein Lieblingssnack.')).not.toBeInTheDocument();
    expect(screen.getByText('Geheimer Preis')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Eine Torte.' })).not.toBeInTheDocument();

    await view.rerender({ prizes, score: 1500, imageUrl: (path) => path });
    expect(screen.getByText('Süße Belohnung')).toBeInTheDocument();
    expect(screen.getByText('Ein Lieblingssnack.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Eine Torte.' })).toBeInTheDocument();
  });
});
