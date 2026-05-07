'use client';

import { Avatar } from '@heroui/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Direction, TimeOfDay, Weather } from '@prisma/client';
import { msToString } from '@/lib/time-format';

const WEATHER_LABEL: Record<Weather, string> = {
  DRY: 'Seco',
  WET: 'Mojado',
  SNOW: 'Nieve',
  ICE: 'Hielo',
};

const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  DAY: 'Día',
  NIGHT: 'Noche',
  DUSK: 'Atardecer',
  DAWN: 'Amanecer',
};

export type CarTimeEntry = {
  id: string;
  totalMs: number;
  timeMs: number;
  penaltyMs: number;
  isDnf: boolean;
  weather: Weather;
  timeOfDay: TimeOfDay;
  createdAt: string;
  runner: { id: string; username: string; photoUrl: string | null };
  stage: {
    id: string;
    name: string;
    distanceKm: number;
    direction: Direction;
    location: { id: string; name: string; country: string };
  };
};

export function CarTimesTable({ times }: { times: CarTimeEntry[] }) {
  const router = useRouter();

  if (times.length === 0) {
    return (
      <div className="border-foreground/10 text-foreground/60 rounded-lg border border-dashed p-8 text-center text-sm">
        Aún no hay tiempos registrados con este coche.
      </div>
    );
  }

  return (
    <div className="border-foreground/10 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-foreground/5 text-foreground/70 text-left text-xs uppercase">
          <tr>
            <th className="px-3 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">Mapa · Tramo</th>
            <th className="px-3 py-3 font-medium">Piloto</th>
            <th className="px-3 py-3 text-right font-medium">Tiempo</th>
            <th className="px-3 py-3 text-right font-medium">Sanción</th>
            <th className="px-3 py-3 text-right font-medium">Total</th>
            <th className="px-3 py-3 font-medium">Cond.</th>
            <th className="px-3 py-3 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {times.map((entry, index) => (
            <tr
              key={entry.id}
              onClick={() => router.push(`/tiempos/${entry.stage.id}`)}
              className="border-foreground/10 hover:bg-foreground/5 cursor-pointer border-t transition-colors"
            >
              <td className="px-3 py-2.5 font-mono text-xs">
                {entry.isDnf ? <span className="text-danger">DNF</span> : index + 1}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-col">
                  <span className="text-foreground/60 text-xs">
                    {entry.stage.location.country} · {entry.stage.location.name}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    {entry.stage.direction === Direction.FORWARD ? (
                      <ArrowUp size={12} className="text-foreground/50" />
                    ) : (
                      <ArrowDown size={12} className="text-foreground/50" />
                    )}
                    {entry.stage.name}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    {entry.runner.photoUrl ? (
                      <Avatar.Image src={entry.runner.photoUrl} alt={entry.runner.username} />
                    ) : null}
                    <Avatar.Fallback>
                      {entry.runner.username.slice(0, 2).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                  <span className="font-medium">{entry.runner.username}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-mono">
                {entry.isDnf ? '—' : msToString(entry.timeMs)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono">
                {entry.penaltyMs > 0 ? `+${msToString(entry.penaltyMs)}` : '—'}
              </td>
              <td className="px-3 py-2.5 text-right font-mono font-semibold">
                {entry.isDnf ? '—' : msToString(entry.totalMs)}
              </td>
              <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
                {WEATHER_LABEL[entry.weather]} · {TIME_OF_DAY_LABEL[entry.timeOfDay]}
              </td>
              <td className="px-3 py-2.5 text-foreground/70 whitespace-nowrap text-xs">
                {new Date(entry.createdAt).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
