import { Button } from '@heroui/react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-8 py-20 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl">🏁</span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">DiRT Tracker</h1>
        <p className="text-foreground/70 max-w-lg text-base sm:text-lg">
          Registra y compara los tiempos de tu grupo en DiRT Rally 2.0.
        </p>
      </div>
      <Button variant="primary" size="lg">
        Componente de prueba
      </Button>
      <div className="flex gap-4 text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Iniciar sesión
        </Link>
        <Link href="/tiempos" className="text-primary hover:underline">
          Ver tiempos
        </Link>
      </div>
    </main>
  );
}
