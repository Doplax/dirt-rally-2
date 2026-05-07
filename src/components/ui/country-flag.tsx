import { Flag } from 'lucide-react';
import Image from 'next/image';

const COUNTRY_TO_SLUG: Record<string, string> = {
  Argentina: 'argentina',
  Australia: 'australia',
  Finland: 'finland',
  Germany: 'germany',
  Greece: 'greece',
  Monaco: 'monaco',
  'New Zealand': 'new-zealand',
  Poland: 'poland',
  'Scotland (UK)': 'scotland',
  Spain: 'spain',
  Sweden: 'sweden',
  USA: 'usa',
  'Wales (UK)': 'wales',
};

export function countryFlagSrc(country: string): string | null {
  const slug = COUNTRY_TO_SLUG[country];
  return slug ? `/icons/flags/${slug}.svg` : null;
}

type Props = {
  country: string;
  /** Inline (small, fits in a text line) or framed (matches combobox row visuals). */
  variant?: 'inline' | 'framed';
};

/**
 * Renders a country's flag. The 'framed' variant matches the h-9 visual slot
 * used by the other IconCombobox visuals (avatar, car photo, etc.) so country
 * options align with everything else.
 */
export function CountryFlag({ country, variant = 'framed' }: Props) {
  const src = countryFlagSrc(country);

  if (variant === 'inline') {
    if (!src) {
      return (
        <span
          className="bg-foreground/5 text-foreground/40 flex h-4 w-6 shrink-0 items-center justify-center rounded-[2px]"
          aria-hidden
        >
          <Flag size={10} />
        </span>
      );
    }
    return (
      <span
        className="bg-foreground/5 relative h-4 w-6 shrink-0 overflow-hidden rounded-[2px]"
        aria-hidden
      >
        <Image src={src} alt={country} fill sizes="24px" className="object-cover" />
      </span>
    );
  }

  return (
    <span
      className="bg-foreground/5 flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded"
      aria-hidden
    >
      {src ? (
        <span className="relative h-6 w-9 overflow-hidden rounded-[2px] shadow-sm ring-1 ring-black/10">
          <Image src={src} alt={country} fill sizes="36px" className="object-cover" />
        </span>
      ) : (
        <Flag size={14} className="text-foreground/40" />
      )}
    </span>
  );
}
