'use client';

import { Button } from '@heroui/react';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleFavoriteCar } from '@/server/actions/cars';

export function FavoriteToggle({
  carId,
  initialFavorited,
}: {
  carId: string;
  initialFavorited: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const onToggle = () => {
    const optimistic = !favorited;
    setFavorited(optimistic);
    startTransition(async () => {
      const result = await toggleFavoriteCar(carId);
      if (!result.ok) {
        setFavorited(!optimistic);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Button
      variant={favorited ? 'primary' : 'secondary'}
      size="sm"
      onPress={onToggle}
      isDisabled={pending}
    >
      <Heart
        size={14}
        className={favorited ? 'fill-current' : ''}
      />
      {favorited ? 'Favorito' : 'Marcar favorito'}
    </Button>
  );
}
