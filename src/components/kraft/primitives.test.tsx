import { screen } from '@testing-library/react-native';

import { render } from '../../../tests/support/render';

import { CategorySquare } from './category-square';
import { CoverHeader } from './cover-header';
import { Stamp } from './stamp';

describe('Stamp', () => {
  test('renders its label uppercased', async () => {
    await render(<Stamp label="no. 014 · field" />);
    expect(screen.getByText('NO. 014 · FIELD')).toBeOnTheScreen();
  });
});

describe('CoverHeader', () => {
  test('renders the title', async () => {
    await render(<CoverHeader title="Notebook" />);
    expect(screen.getByText('Notebook')).toBeOnTheScreen();
  });

  test('renders the subtitle when given', async () => {
    await render(<CoverHeader title="Notebook" subtitle="14 entries" />);
    expect(screen.getByText('14 ENTRIES')).toBeOnTheScreen();
  });

  test('renders the stamp when given', async () => {
    await render(<CoverHeader title="Notebook" stamp="no. 014" />);
    expect(screen.getByText('NO. 014')).toBeOnTheScreen();
  });

  test('omits the subtitle element when not given', async () => {
    await render(<CoverHeader title="Notebook" />);
    expect(screen.queryByTestId('cover-subtitle')).toBeNull();
  });
});

describe('CategorySquare', () => {
  test('renders a square tinted with the category colour', async () => {
    await render(<CategorySquare category="home" />);
    expect(screen.getByTestId('category-square-home')).toHaveStyle({
      backgroundColor: '#2F6C69',
    });
  });

  test('renders nothing when the category is null', async () => {
    await render(<CategorySquare category={null} />);
    expect(screen.queryByTestId(/category-square/)).toBeNull();
  });
});
