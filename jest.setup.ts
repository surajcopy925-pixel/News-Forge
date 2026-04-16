import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/input',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/font
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'inter' }),
  JetBrains_Mono: () => ({ className: 'jetbrains' }),
  Noto_Sans_Kannada: () => ({ className: 'noto-kannada' }),
}));
